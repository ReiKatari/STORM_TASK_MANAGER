import { json } from '@sveltejs/kit';
import { runTask } from '$lib/server/cron-manager.js';

export async function POST({ params }) {
	try {
		const log = await runTask(parseInt(params.id));
		return json(log);
	} catch (err) {
		return json({ error: err.message }, { status: 500 });
	}
}
