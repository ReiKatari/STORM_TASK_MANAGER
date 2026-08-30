import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { executeQuery } from './db.js';
import { writeToSheet, recordsetToArray } from './google-sheets.js';

// ── Time helper: Moscow timezone ──
function moscowNow() {
	return new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Moscow' }).replace('T', ' ');
}
function moscowTimestamp() {
	const d = new Date();
	const parts = d.toLocaleString('en-GB', { timeZone: 'Europe/Moscow', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).split(/[\/, :]+/);
	// en-GB gives DD/MM/YYYY, HH:MM:SS
	return `${parts[2]}-${parts[1]}-${parts[0]} ${parts[3]}:${parts[4]}:${parts[5]}`;
}

// ── Persistence file paths ──
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../../data');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
	fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ── Load / Save helpers ──
function loadJSON(filePath, fallback) {
	try {
		if (fs.existsSync(filePath)) {
			return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
		}
	} catch (e) {
		console.warn(`Failed to load ${filePath}:`, e.message);
	}
	return fallback;
}

function saveJSON(filePath, data) {
	try {
		fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
	} catch (e) {
		console.warn(`Failed to save ${filePath}:`, e.message);
	}
}

// ── Initialize state from disk ──
let tasks = loadJSON(TASKS_FILE, []);
let logs = loadJSON(LOGS_FILE, []);
let taskIdCounter = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;

// Use globalThis to survive HMR module reloads
if (!globalThis.__tm_scheduledJobs) globalThis.__tm_scheduledJobs = new Map();
if (!globalThis.__tm_runningTaskIds) globalThis.__tm_runningTaskIds = new Set();
const scheduledJobs = globalThis.__tm_scheduledJobs;
const runningTaskIds = globalThis.__tm_runningTaskIds;
let autoRestartTimer = globalThis.__tm_autoRestartTimer || null;

function saveTasks() { saveJSON(TASKS_FILE, tasks); }
function saveLogs() { saveJSON(LOGS_FILE, logs); }

// ── Task CRUD ──
export function getAllTasks() {
	return [...tasks];
}

export function getTaskById(id) {
	return tasks.find(t => t.id === id);
}

export function createTask(taskData) {
	const task = {
		id: taskIdCounter++,
		...taskData,
		status: 'waiting',
		createdAt: new Date().toISOString()
	};
	tasks.push(task);
	scheduleTask(task);
	saveTasks();
	return task;
}

export function updateTask(id, taskData) {
	const idx = tasks.findIndex(t => t.id === id);
	if (idx === -1) return null;
	
	tasks[idx] = { ...tasks[idx], ...taskData };
	
	// Reschedule if cron changed
	unscheduleTask(id);
	scheduleTask(tasks[idx]);
	
	saveTasks();
	return tasks[idx];
}

export function deleteTask(id) {
	const idx = tasks.findIndex(t => t.id === id);
	if (idx === -1) return false;
	
	unscheduleTask(id);
	tasks.splice(idx, 1);
	saveTasks();
	return true;
}

// ── CRON Scheduling ──
function scheduleTask(task) {
	if (!cron.validate(task.cronExpression)) {
		console.warn(`Invalid CRON for task "${task.name}": ${task.cronExpression}`);
		return;
	}

	const job = cron.schedule(task.cronExpression, async () => {
		await runTask(task.id);
	}, { scheduled: true, timezone: 'Europe/Moscow' });

	scheduledJobs.set(task.id, job);
}

function unscheduleTask(id) {
	const job = scheduledJobs.get(id);
	if (job) {
		job.stop();
		scheduledJobs.delete(id);
	}
}

// ── Task cancellation tracking ──
const runningAbortControllers = new Map();

export function cancelTask(id) {
	const task = getTaskById(id);
	if (!task) throw new Error('Task not found');
	
	const controller = runningAbortControllers.get(id);
	if (controller) {
		controller.abort();
		runningAbortControllers.delete(id);
	}
	
	// Update any running log entries to cancelled
	const runningLog = logs.find(l => l.taskName === task.name && l.status === 'running');
	if (runningLog) {
		runningLog.status = 'cancelled';
		runningLog.errorMessage = 'Задача отменена пользователем';
		runningLog.endTime = moscowTimestamp();
		// Calculate duration from start to now
		const startMs = new Date(runningLog.startTime.replace(' ', 'T')).getTime();
		runningLog.duration = parseFloat(((Date.now() - startMs) / 1000).toFixed(2));
	}
	
	// Set task status back to waiting immediately
	task.status = 'waiting';
	runningTaskIds.delete(id);
	saveTasks();
	saveLogs();
	
	return { success: true, message: `Задача "${task.name}" отменена` };
}

export async function runTask(id) {
	const task = getTaskById(id);
	if (!task) throw new Error('Task not found');

	// Synchronous guard: prevent concurrent runs
	if (runningTaskIds.has(id)) {
		console.log(`⏳ Task "${task.name}" is already running, skipping`);
		return { status: 'skipped', taskName: task.name };
	}
	runningTaskIds.add(id);

	const startTime = new Date();
	let status = 'success';
	let sheetUrl = '';
	let errorMessage = '';

	// Create an AbortController for this run
	const abortController = new AbortController();
	runningAbortControllers.set(id, abortController);

	// Immediately add a "running" log entry so it appears in the logs table
	const runningLogId = `log_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
	const runningLog = {
		id: runningLogId,
		taskName: task.name,
		startTime: moscowTimestamp(),
		endTime: null,
		duration: null,
		sheetUrl: '',
		status: 'running'
	};
	logs.unshift(runningLog);

	try {
		// Update task status
		task.status = 'running';
		console.log(`🚀 Task "${task.name}" started at ${startTime.toISOString()}`);
		
		// Check if already cancelled
		if (abortController.signal.aborted) throw new Error('Задача отменена');
		
		// Execute SQL query
		const recordset = await executeQuery(task.sqlQuery);
		
		// Check cancellation after SQL
		if (abortController.signal.aborted) throw new Error('Задача отменена');
		
		// Write to Google Sheet
		if (task.googleSheetKey && task.sheetName) {
			const data = recordsetToArray(recordset);
			await writeToSheet(task.googleSheetKey, task.sheetName, data, task.keepImport);
			sheetUrl = `https://docs.google.com/spreadsheets/d/${task.googleSheetKey}`;
		}

		// Send notification
		if (task.notificationUrl) {
			try {
				await fetch(task.notificationUrl, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						taskId: task.id,
						taskName: task.name,
						status: 'success',
						rowCount: recordset.length
					})
				});
			} catch (e) {
				console.warn(`Notification failed for "${task.name}":`, e.message);
			}
		}
	} catch (err) {
		if (abortController.signal.aborted || err.message === 'Задача отменена') {
			status = 'cancelled';
			errorMessage = 'Задача отменена пользователем';
			console.log(`Task "${task.name}" was cancelled`);
		} else {
			status = 'error';
			errorMessage = err.message;
			console.error(`Task "${task.name}" failed:`, err.message);
		}
	} finally {
		task.status = 'waiting';
		runningAbortControllers.delete(id);
		runningTaskIds.delete(id);
		saveTasks();
	}

	const endTime = new Date();
	const duration = ((endTime - startTime) / 1000).toFixed(2);

	// Update the running log entry in-place
	const logIdx = logs.findIndex(l => l.id === runningLogId);
	if (logIdx !== -1) {
		logs[logIdx].endTime = moscowTimestamp();
		logs[logIdx].duration = parseFloat(duration);
		logs[logIdx].sheetUrl = sheetUrl;
		logs[logIdx].status = status;
		if (errorMessage) logs[logIdx].errorMessage = errorMessage;
	}

	saveLogs();
	return logs[logIdx] || runningLog;
}

// ── Logs ──
export function getAllLogs() {
	return [...logs];
}

export function clearLogs() {
	logs = [];
	saveLogs();
}

// ── Service Management ──
export function restartService() {
	// Stop all scheduled jobs
	for (const [id, job] of scheduledJobs) {
		job.stop();
	}
	scheduledJobs.clear();

	// Re-schedule all tasks
	for (const task of tasks) {
		scheduleTask(task);
	}

	return { message: 'Сервис перезапущен', scheduledCount: scheduledJobs.size };
}

// Schedule all existing tasks on startup
export function initScheduler() {
	// Stop all existing jobs first (prevents duplicates on HMR)
	for (const [id, job] of scheduledJobs) {
		job.stop();
	}
	scheduledJobs.clear();
	runningTaskIds.clear();

	// Reset any tasks stuck in 'running' state from previous crash
	for (const task of tasks) {
		if (task.status === 'running') {
			task.status = 'waiting';
		}
		scheduleTask(task);
	}
	saveTasks();

	// Clean up stale 'running' log entries from previous crash
	let staleCount = 0;
	for (const log of logs) {
		if (log.status === 'running') {
			log.status = 'error';
			log.errorMessage = 'Задача прервана перезагрузкой сервера';
			log.endTime = moscowTimestamp();
			staleCount++;
		}
	}
	if (staleCount > 0) {
		saveLogs();
		console.log(`🧹 Cleaned up ${staleCount} stale 'running' log entries`);
	}
	console.log(`✅ Scheduler initialized: ${scheduledJobs.size} tasks scheduled`);
}

// ── Auto-restart ──
export function setAutoRestart(intervalHours) {
	// Clear previous timer
	if (autoRestartTimer) {
		clearInterval(autoRestartTimer);
		autoRestartTimer = null;
		globalThis.__tm_autoRestartTimer = null;
	}

	if (intervalHours > 0) {
		const ms = intervalHours * 60 * 60 * 1000;
		autoRestartTimer = setInterval(() => {
			console.log(`🔄 Auto-restarting service (every ${intervalHours}h)...`);
			restartService();
		}, ms);
		globalThis.__tm_autoRestartTimer = autoRestartTimer;
		console.log(`⏰ Auto-restart configured: every ${intervalHours} hours`);
	}
}
