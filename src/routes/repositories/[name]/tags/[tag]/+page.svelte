<script lang="ts">
	import { page } from '$app/stores';
	import { Badge } from '$lib/components/ui/badge';
	import PullCommand from '$lib/components/PullCommand.svelte';
	import CliHint from '$lib/components/CliHint.svelte';
	import { formatBytes } from '$lib/utils';
	import Layers from '@lucide/svelte/icons/layers';
	import Loader from '@lucide/svelte/icons/loader';
	import {
		getDistribution,
		getRepository,
		getTag,
		getManifest,
		type ContainerDistribution,
		type ContainerTag,
		type ContainerManifest
	} from '$lib/pulp';
	import { auth } from '$lib/auth.svelte';

	let distribution = $state<ContainerDistribution | null>(null);
	let registryPath = $state('');
	let tag = $state<ContainerTag | null>(null);
	let manifest = $state<ContainerManifest | null>(null);
	let platforms = $state<ContainerManifest[]>([]);
	let loading = $state(true);
	let error = $state('');
	let notFound = $state('');

	$effect(() => {
		const name = decodeURIComponent($page.params.name!);
		const tagName = decodeURIComponent($page.params.tag!);
		loading = true;
		error = '';
		notFound = '';

		(async () => {
			try {
				const dist = await getDistribution(name);
				if (!dist) {
					notFound = 'Repository not found';
					return;
				}
				distribution = dist;

				const pulpHost = new URL(auth.pulpUrl).host;
				registryPath = `${pulpHost}/${dist.base_path}`;

				const repo = await getRepository(dist.repository);
				const t = await getTag(repo.latest_version_href, tagName);
				if (!t) {
					notFound = 'Tag not found';
					return;
				}
				tag = t;

				const m = await getManifest(t.tagged_manifest);
				manifest = m;

				if (m.type === 'index' && m.listed_manifests.length > 0) {
					platforms = await Promise.all(
						m.listed_manifests.map((href) => getManifest(href))
					);
				}
			} catch (e) {
				error = e instanceof Error ? e.message : 'Unknown error';
			} finally {
				loading = false;
			}
		})();
	});

	const shortName = $derived(distribution?.name.split('/').pop() ?? distribution?.name ?? '');
</script>

<div class="mx-auto max-w-4xl p-6 space-y-6" data-testid="tag-content">
	{#if loading}
		<div class="flex justify-center py-16">
			<Loader class="size-8 animate-spin text-muted-foreground" />
		</div>
	{:else if notFound}
		<p class="text-destructive">{notFound}</p>
	{:else if error}
		<p class="text-destructive">{error}</p>
	{:else if manifest && tag && distribution}
		<div>
			<div class="flex items-center gap-3 flex-wrap">
				<h1 class="text-2xl font-bold">{shortName}:{tag.name}</h1>
				<Badge variant="secondary">{manifest.type === 'index' ? 'Multi-arch' : 'Image'}</Badge>
				{#if manifest.architecture && manifest.architecture !== 'unknown'}
					<Badge variant="outline">{manifest.architecture}</Badge>
				{/if}
				{#if manifest.os && manifest.os !== 'unknown'}
					<Badge variant="outline">{manifest.os}</Badge>
				{/if}
			</div>
			<p class="mt-1 text-sm text-muted-foreground font-mono">{manifest.digest}</p>
		</div>

		<CliHint>
			<span class="text-muted-foreground">Requires chaining: tag → manifest href → manifest details</span>
		</CliHint>

		<PullCommand {registryPath} tag={tag.name} />

		{#if manifest.compressed_image_size}
			<p class="text-sm text-muted-foreground">
				Total size: <span class="font-medium text-foreground">{formatBytes(manifest.compressed_image_size)}</span>
			</p>
		{/if}

		{#if manifest.type === 'index'}
			<div>
				<h2 class="text-lg font-semibold mb-3">Platforms ({platforms.length})</h2>
				<div class="rounded-md border">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b bg-muted/50">
								<th class="px-4 py-2 text-left font-medium">Architecture</th>
								<th class="px-4 py-2 text-left font-medium">OS</th>
								<th class="px-4 py-2 text-left font-medium">Digest</th>
								<th class="px-4 py-2 text-left font-medium">Size</th>
							</tr>
						</thead>
						<tbody>
							{#each platforms as platform (platform.pulp_href)}
								<tr class="border-b last:border-0">
									<td class="px-4 py-2">{platform.architecture ?? 'unknown'}</td>
									<td class="px-4 py-2">{platform.os ?? 'unknown'}</td>
									<td class="px-4 py-2 font-mono text-xs text-muted-foreground" title={platform.digest}>
										{platform.digest.slice(7, 19)}
									</td>
									<td class="px-4 py-2 text-muted-foreground">
										{platform.compressed_image_size ? formatBytes(platform.compressed_image_size) : '—'}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{:else if manifest.blobs.length > 0}
			<div>
				<h2 class="text-lg font-semibold mb-3">Layers ({manifest.blobs.length})</h2>
				<div class="rounded-md border">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b bg-muted/50">
								<th class="px-4 py-2 text-left font-medium">Digest</th>
								<th class="px-4 py-2 text-left font-medium">Media type</th>
							</tr>
						</thead>
						<tbody>
							{#each manifest.blobs as blobHref (blobHref)}
								<tr class="border-b last:border-0">
									<td class="px-4 py-2 font-mono text-xs text-muted-foreground">
										{blobHref.split('/').at(-2)?.slice(0, 12) ?? '—'}
									</td>
									<td class="px-4 py-2 text-muted-foreground">{manifest.media_type}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{:else}
			<div class="flex flex-col items-center justify-center py-16 text-muted-foreground">
				<Layers class="size-12 mb-4" />
				<p>No layer information available (on_demand mode — layers not pulled yet)</p>
			</div>
		{/if}
	{/if}
</div>
