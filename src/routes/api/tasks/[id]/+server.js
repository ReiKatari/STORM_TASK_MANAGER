import { json } from '@sveltejs/kit';
import { getTaskById, updateTask, deleteTask } from '$lib/server/cron-manager.js';

export async function GET({ params }) {
	const task = getTaskById(parseInt(params.id));
	if (!task) return json({ error: 'Task not found' }, { status: 404 });
	return json(task);
}

export async function PUT({ params, request }) {
	const data = await request.json();
	const task = updateTask(parseInt(params.id), data);
	if (!task) return json({ error: 'Task not found' }, { status: 404 });
	return json(task);
}

export async function DELETE({ params }) {
	const ok = deleteTask(parseInt(params.id));
	if (!ok) return json({ error: 'Task not found' }, { status: 404 });
	return json({ success: true });
}
