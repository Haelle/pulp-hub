import { redirect, fail } from '@sveltejs/kit';
import { pulpLogin } from '$lib/pulp';
import type { Actions } from './$types';

export const actions = {
	default: async ({ request, cookies, url }) => {
		const data = await request.formData();
		const pulpUrl = (data.get('url') as string).replace(/\/+$/, '');
		const username = data.get('username') as string;
		const password = data.get('password') as string;

		const secure = url.protocol === 'https:';

		try {
			const session = await pulpLogin(pulpUrl, username, password);

			const cookieOpts = { path: '/', httpOnly: true, sameSite: 'lax' as const, secure };
			cookies.set('pulp_url', pulpUrl, cookieOpts);
			cookies.set('pulp_session', session.sessionid, cookieOpts);
		} catch (e) {
			const message = e instanceof Error ? e.message : 'Unknown error';
			return fail(400, { error: message });
		}

		redirect(303, '/status');
	}
} satisfies Actions;
