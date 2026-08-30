import { redirect } from '@sveltejs/kit';

export async function POST({ cookies }) {
	cookies.delete('tm-auth-token', { path: '/' });
	throw redirect(302, '/');
}
