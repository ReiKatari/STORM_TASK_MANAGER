import { verifyToken } from '$lib/server/auth.js';
import { initScheduler } from '$lib/server/cron-manager.js';
import 'dotenv/config';

let schedulerInitialized = false;

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	// Initialize CRON scheduler once
	if (!schedulerInitialized) {
		initScheduler();
		schedulerInitialized = true;
	}

	// Read auth token from cookie
	const token = event.cookies.get('tm-auth-token');
	
	if (token) {
		const user = verifyToken(token);
		if (user) {
			event.locals.user = user;
		} else {
			// Invalid token — clear cookie
			event.cookies.delete('tm-auth-token', { path: '/' });
		}
	}

	// Protect dashboard and admin routes
	const protectedPaths = ['/dashboard', '/tasks', '/stats', '/admin', '/api/'];
	const isProtected = protectedPaths.some(p => event.url.pathname.startsWith(p));
	
	if (isProtected && !event.locals.user) {
		if (event.url.pathname.startsWith('/api/')) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}
		return new Response(null, {
			status: 302,
			headers: { location: '/' }
		});
	}

	const response = await resolve(event);
	return response;
}
