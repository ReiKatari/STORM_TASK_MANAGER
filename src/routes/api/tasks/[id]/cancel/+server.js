import { json } from '@sveltejs/kit';
import { cancelTask } from '$lib/server/cron-manager.js';

export async function POST({ params }) {
	try {
		const result = cancelTask(parseInt(params.id));
		return json(result);
	} catch (err) {
		return json({ error: err.message }, { status: 500 });
	}
}
