import { getAllTasks } from '$lib/server/cron-manager.js';

export async function load() {
	return {
		tasks: getAllTasks()
	};
}
