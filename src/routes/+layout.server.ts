import { redirect } from '@sveltejs/kit';
import { pulpFetch } from '$lib/pulp';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies, url }) => {
	// Don't guard the login page
	if (url.pathname === '/') {
		return { authenticated: false };
	}

	const pulpUrl = cookies.get('pulp_url');
	const sessionid = cookies.get('pulp_session');

	if (!pulpUrl || !sessionid) {
		redirect(303, '/');
	}

	// Validate session is still active
	const response = await pulpFetch(`${pulpUrl}/pulp/api/v3/status/`, sessionid);

	if (!response.ok) {
		// Session expired or invalid — clear cookies and redirect to login
		cookies.delete('pulp_url', { path: '/' });
		cookies.delete('pulp_session', { path: '/' });
		redirect(303, '/');
	}

	return { authenticated: true, pulpUrl };
};
