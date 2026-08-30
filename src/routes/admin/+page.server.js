import { getAllLogs } from '$lib/server/cron-manager.js';

export async function load() {
	return {
		logs: getAllLogs()
	};
}
