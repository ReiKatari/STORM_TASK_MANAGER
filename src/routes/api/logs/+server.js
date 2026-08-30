import { json } from '@sveltejs/kit';
import { getAllLogs, clearLogs } from '$lib/server/cron-manager.js';

export async function GET() {
	return json(getAllLogs());
}

export async function DELETE() {
	clearLogs();
	return json({ success: true });
}
