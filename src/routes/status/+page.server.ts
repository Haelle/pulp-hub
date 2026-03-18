import { pulpFetch } from '$lib/pulp';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const url = cookies.get('pulp_url')!;
	const sessionid = cookies.get('pulp_session')!;

	const response = await pulpFetch(`${url}/pulp/api/v3/status/`, sessionid);
	const status = await response.json();

	return { status, url };
};
