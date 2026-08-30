import { authenticateUser, createToken } from '$lib/server/auth.js';
import { redirect, fail } from '@sveltejs/kit';

export async function load({ locals }) {
	if (locals.user) {
		throw redirect(302, '/dashboard');
	}
}

export const actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData();
		const username = formData.get('username');
		const password = formData.get('password');

		if (!username || !password) {
			return fail(400, { error: 'Введите имя пользователя и пароль', username });
		}

		const user = authenticateUser(username, password);
		if (!user) {
			return fail(401, { error: 'Неверное имя пользователя или пароль', username });
		}

		const token = createToken(user);
		cookies.set('tm-auth-token', token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 // 24 hours
		});

		throw redirect(302, '/dashboard');
	}
};
