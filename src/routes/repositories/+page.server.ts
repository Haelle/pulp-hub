import { getDistributions } from '$lib/pulp';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const pulpUrl = cookies.get('pulp_url')!;
	const sessionid = cookies.get('pulp_session')!;
	const offset = parseInt(url.searchParams.get('offset') ?? '0');
	const limit = 20;

	const distributions = await getDistributions(pulpUrl, sessionid, limit, offset);

	return { distributions, offset, limit };
};
