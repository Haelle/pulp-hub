import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	cookies.delete('pulp_url', { path: '/' });
	cookies.delete('pulp_session', { path: '/' });
	redirect(303, '/');
};
