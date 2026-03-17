import { redirect } from '@sveltejs/kit';
import { pulpFetch } from '$lib/pulp';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const url = cookies.get('pulp_url');
	const sessionid = cookies.get('pulp_session');

	if (!url || !sessionid) {
		redirect(303, '/');
	}

	const response = await pulpFetch(`${url}/pulp/api/v3/status/`, sessionid);

	if (!response.ok) {
		redirect(303, '/');
	}

	const status = await response.json();
	return { status, url };
};
