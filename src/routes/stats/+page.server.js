import { getAllTasks, getAllLogs } from '$lib/server/cron-manager.js';

export async function load() {
	return {
		tasks: getAllTasks(),
		logs: getAllLogs()
	};
}
