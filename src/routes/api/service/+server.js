import { json } from '@sveltejs/kit';
import { restartService, setAutoRestart } from '$lib/server/cron-manager.js';

export async function POST({ request }) {
	const body = await request.json();
	const { action } = body;
	
	switch (action) {
		case 'restart': {
			const result = restartService();
			return json(result);
		}
		case 'autorestart': {
			const intervalHours = parseInt(body.intervalHours) || 24;
			setAutoRestart(intervalHours);
			return json({ message: `Автоперезапуск настроен каждые ${intervalHours} ч.` });
		}
		default:
			return json({ error: 'Unknown action' }, { status: 400 });
	}
}
