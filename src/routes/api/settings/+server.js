import { json } from '@sveltejs/kit';
import { getConfig, updateConfig, testConnection } from '$lib/server/db.js';
import { restartService } from '$lib/server/cron-manager.js';

export async function GET() {
	const cfg = getConfig();
	return json({ ...cfg, password: '••••••••', vpnPassword: '••••••••' });
}

export async function PUT({ request }) {
	const data = await request.json();
	const updates = {
		server: data.server,
		database: data.database,
		user: data.user,
		vpnUser: data.vpnUser,
	};
	// Only update password if user actually changed it (not the masked value)
	if (data.password && data.password !== '••••••••') {
		updates.password = data.password;
	}
	if (data.vpnPassword && data.vpnPassword !== '••••••••') {
		updates.vpnPassword = data.vpnPassword;
	}
	updateConfig(updates);
	return json({ success: true, message: 'Настройки соединения сохранены' });
}

export async function POST() {
	try {
		const result = await testConnection();
		return json({ success: true, message: `Подключение успешно! Сервер: ${result.version}` });
	} catch (err) {
		return json({ success: false, message: err.message }, { status: 500 });
	}
}
