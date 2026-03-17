import { redirect, fail } from '@sveltejs/kit';
import { pulpFetch } from '$lib/pulp';
import type { Actions } from './$types';

export const actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const url = (data.get('url') as string).replace(/\/+$/, '');
		const username = data.get('username') as string;
		const password = data.get('password') as string;
		const auth = btoa(`${username}:${password}`);

		try {
			const response = await pulpFetch(`${url}/v2/`, auth);

			if (!response.ok) {
				return fail(400, { error: `Authentication failed (${response.status})` });
			}

			cookies.set('pulp_url', url, { path: '/', httpOnly: true, sameSite: 'lax' });
			cookies.set('pulp_auth', auth, { path: '/', httpOnly: true, sameSite: 'lax' });
		} catch (e) {
			const message = e instanceof Error ? e.message : 'Unknown error';
			return fail(400, { error: `Cannot reach Pulp: ${message}` });
		}

		redirect(303, '/status');
	}
} satisfies Actions;
