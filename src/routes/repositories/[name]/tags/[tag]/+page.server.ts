import { error } from '@sveltejs/kit';
import { getDistribution, getRepository, getTag, getManifest } from '$lib/pulp';
import type { ContainerManifest } from '$lib/pulp';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, params }) => {
	const pulpUrl = cookies.get('pulp_url')!;
	const sessionid = cookies.get('pulp_session')!;

	const distribution = await getDistribution(pulpUrl, sessionid, params.name);
	if (!distribution) {
		error(404, 'Repository not found');
	}

	const repository = await getRepository(pulpUrl, sessionid, distribution.repository);
	const tag = await getTag(pulpUrl, sessionid, repository.latest_version_href, params.tag);
	if (!tag) {
		error(404, 'Tag not found');
	}

	const manifest = await getManifest(pulpUrl, sessionid, tag.tagged_manifest);

	// For multi-arch (index), fetch listed manifests to show platforms
	let platforms: ContainerManifest[] = [];
	if (manifest.type === 'index' && manifest.listed_manifests.length > 0) {
		platforms = await Promise.all(
			manifest.listed_manifests.map((href) => getManifest(pulpUrl, sessionid, href))
		);
	}

	const pulpHost = new URL(pulpUrl).host;
	const registryPath = `${pulpHost}/${distribution.base_path}`;

	return {
		distribution,
		registryPath,
		tag,
		manifest,
		platforms
	};
};
