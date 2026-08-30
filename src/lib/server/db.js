import sql from 'mssql';
import { loadSettings, saveSettings } from './settings-store.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import os from 'os';
import path from 'path';

const execAsync = promisify(exec);

let pool = null;

// Load saved settings or use defaults
const savedSettings = loadSettings();
let config = {
	server: savedSettings?.server || process.env.SQL_SERVER || 'SRV-SQL1.lanta.lan',
	database: savedSettings?.database || process.env.SQL_DATABASE || 'is4_lanta_repl',
	user: savedSettings?.user || process.env.SQL_USER || 'gsheets',
	password: savedSettings?.password || process.env.SQL_PASSWORD || '',
	vpnUser: savedSettings?.vpnUser || process.env.VPN_USER || '',
	vpnPassword: savedSettings?.vpnPassword || process.env.VPN_PASSWORD || '',
	connectionTimeout: 15000,
	requestTimeout: 600000,
	options: {
		encrypt: false,
		trustServerCertificate: true,
		enableArithAbort: true,
	},
	pool: {
		max: 10,
		min: 0,
		idleTimeoutMillis: 30000
	}
};

export function updateConfig(newConfig) {
	config = { ...config, ...newConfig };
	pool = null; // reset pool so next query uses new config
	// Persist to disk
	saveSettings({
		server: config.server,
		database: config.database,
		user: config.user,
		password: config.password,
		vpnUser: config.vpnUser,
		vpnPassword: config.vpnPassword
	});
}

export function getConfig() {
	return {
		server: config.server,
		database: config.database,
		user: config.user,
		password: config.password,
		vpnUser: config.vpnUser,
		vpnPassword: config.vpnPassword
	};
}

async function ensureVpnConnection() {
	if (!config.server) return;
	const host = config.server.split(',')[0].trim();

	// Быстрый пинг — хост уже доступен?
	try {
		await execAsync(`ping -n 1 -w 1000 ${host}`, { windowsHide: true });
		return;
	} catch (_) {
		console.warn(`[VPN] Не удалось пропинговать ${host}. Проверяю конфликты VPN...`);
	}

	// Сбросить DNS-кеш
	try { await execAsync('ipconfig /flushdns', { windowsHide: true }); } catch(_) {}
	await new Promise(r => setTimeout(r, 2000));

	// Повторный пинг после сброса DNS
	try {
		await execAsync(`ping -n 1 -w 2000 ${host}`, { windowsHide: true });
		console.log(`[VPN] ✅ Хост ${host} стал доступен после сброса DNS.`);
		return;
	} catch (_) {}

	// Если хост всё ещё недоступен — Cisco VPN, вероятно, не подключён
	console.warn(`[VPN] ⚠️ Хост ${host} недоступен. Убедитесь, что Cisco VPN подключён через GUI и настроены исключения.`);
}


export async function getPool() {
	if (pool && pool.connected) {
		return pool;
	}
	// Pool is null or disconnected — create fresh
	pool = null;
	try {
		await ensureVpnConnection();
		pool = await sql.connect(config);
	} catch (err) {
		console.error('SQL Connection Error:', err.message);
		pool = null;
		throw err;
	}
	return pool;
}

export async function executeQuery(queryText) {
	const maxRetries = 3;
	const retryDelay = 5000; // 5 seconds between retries
	// Prevent deadlocks on replication databases
	const fullQuery = 'SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;\n' + queryText;

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			const p = await getPool();
			const request = p.request();
			request.timeout = 600000; // 10 minutes for heavy queries
			const result = await request.query(fullQuery);
			return result.recordset;
		} catch (err) {
			const isTransient = err.message.includes('deadlock')
				|| err.message.includes('NOLOCK')
				|| err.message.includes('data movement')
				|| err.message.includes('Connection is closed');

			if (isTransient && attempt < maxRetries) {
				console.warn(`SQL transient error (attempt ${attempt}/${maxRetries}): ${err.message}. Retrying in ${retryDelay/1000}s...`);
				pool = null;
				await new Promise(r => setTimeout(r, retryDelay));
				continue;
			}
			// Final attempt or non-transient error
			pool = null;
			throw err;
		}
	}
}

export async function closePool() {
	if (pool) {
		await pool.close();
		pool = null;
	}
}

export async function testConnection() {
	// Always create a fresh connection for testing (bypass cached pool)
	let testPool = null;
	try {
		await ensureVpnConnection();
		testPool = await sql.connect({ ...config, connectionTimeout: 10000, requestTimeout: 10000 });
		const result = await testPool.request().query('SELECT @@VERSION AS version');
		const version = result.recordset[0]?.version || 'Unknown';
		return { version: version.split('\n')[0] };
	} catch (err) {
		throw new Error(`Не удалось подключиться к SQL Server: ${err.message}`);
	} finally {
		if (testPool) {
			try { await testPool.close(); } catch {}
		}
	}
}

export { sql };
