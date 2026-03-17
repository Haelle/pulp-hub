import { redirect, fail } from '@sveltejs/kit';
import { pulpLogin } from '$lib/pulp';
import type { Actions } from './$types';

export const actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const url = (data.get('url') as string).replace(/\/+$/, '');
		const username = data.get('username') as string;
		const password = data.get('password') as string;

		try {
			const session = await pulpLogin(url, username, password);

			cookies.set('pulp_url', url, { path: '/', httpOnly: true, sameSite: 'lax' });
			cookies.set('pulp_session', session.sessionid, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax'
			});
		} catch (e) {
			const message = e instanceof Error ? e.message : 'Unknown error';
			return fail(400, { error: message });
		}

		redirect(303, '/status');
	}
} satisfies Actions;
