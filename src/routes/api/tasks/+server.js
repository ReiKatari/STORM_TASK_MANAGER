import { json } from '@sveltejs/kit';
import { getAllTasks, createTask } from '$lib/server/cron-manager.js';

export async function GET() {
	return json(getAllTasks());
}

export async function POST({ request }) {
	const data = await request.json();
	
	if (!data.name || !data.cronExpression || !data.sqlQuery) {
		return json({ error: 'Название, CRON и SQL-запрос обязательны' }, { status: 400 });
	}

	const task = createTask({
		name: data.name,
		cronExpression: data.cronExpression,
		sqlQuery: data.sqlQuery,
		googleSheetKey: data.googleSheetKey || '',
		sheetName: data.sheetName || '',
		keepImport: data.keepImport || false,
		notificationUrl: data.notificationUrl || '',
		hasEndpoint: data.hasEndpoint || false,
		creator: data.creator || '',
		requester: data.requester || '',
		dbSource: data.dbSource || 'SINC'
	});

	return json(task, { status: 201 });
}
