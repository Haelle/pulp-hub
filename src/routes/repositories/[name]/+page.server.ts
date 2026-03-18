import { error } from '@sveltejs/kit';
import { getDistribution, getRepository, getTags } from '$lib/pulp';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, params }) => {
	const pulpUrl = cookies.get('pulp_url')!;
	const sessionid = cookies.get('pulp_session')!;

	const distribution = await getDistribution(pulpUrl, sessionid, params.name);
	if (!distribution) {
		error(404, 'Repository not found');
	}

	const repository = await getRepository(pulpUrl, sessionid, distribution.repository);
	const tags = await getTags(pulpUrl, sessionid, repository.latest_version_href);

	// Build registry path from the Pulp URL host instead of Pulp's content_origin
	const pulpHost = new URL(pulpUrl).host;
	const registryPath = `${pulpHost}/${distribution.base_path}`;

	return {
		distribution,
		registryPath,
		tags: tags.results.sort((a, b) => b.pulp_created.localeCompare(a.pulp_created))
	};
};
