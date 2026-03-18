<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import PullCommand from '$lib/components/PullCommand.svelte';
	import CliHint from '$lib/components/CliHint.svelte';
	import { formatBytes } from '$lib/utils';
	import Layers from '@lucide/svelte/icons/layers';

	let { data } = $props();

	const shortName = $derived(data.distribution.name.split('/').pop() ?? data.distribution.name);
</script>

<div class="mx-auto max-w-4xl p-6 space-y-6" data-testid="tag-content">
	<div>
		<div class="flex items-center gap-3 flex-wrap">
			<h1 class="text-2xl font-bold">{shortName}:{data.tag.name}</h1>
			<Badge variant="secondary">{data.manifest.type === 'index' ? 'Multi-arch' : 'Image'}</Badge>
			{#if data.manifest.architecture && data.manifest.architecture !== 'unknown'}
				<Badge variant="outline">{data.manifest.architecture}</Badge>
			{/if}
			{#if data.manifest.os && data.manifest.os !== 'unknown'}
				<Badge variant="outline">{data.manifest.os}</Badge>
			{/if}
		</div>
		<p class="mt-1 text-sm text-muted-foreground font-mono">{data.manifest.digest}</p>
	</div>

	<CliHint>
		<span class="text-muted-foreground">Requires chaining: tag → manifest href → manifest details</span>
	</CliHint>

	<PullCommand registryPath={data.registryPath} tag={data.tag.name} />

	{#if data.manifest.compressed_image_size}
		<p class="text-sm text-muted-foreground">
			Total size: <span class="font-medium text-foreground">{formatBytes(data.manifest.compressed_image_size)}</span>
		</p>
	{/if}

	{#if data.manifest.type === 'index'}
		<div>
			<h2 class="text-lg font-semibold mb-3">Platforms ({data.platforms.length})</h2>
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
						{#each data.platforms as platform (platform.pulp_href)}
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
	{:else if data.manifest.blobs.length > 0}
		<div>
			<h2 class="text-lg font-semibold mb-3">Layers ({data.manifest.blobs.length})</h2>
			<div class="rounded-md border">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b bg-muted/50">
							<th class="px-4 py-2 text-left font-medium">Digest</th>
							<th class="px-4 py-2 text-left font-medium">Media type</th>
						</tr>
					</thead>
					<tbody>
						{#each data.manifest.blobs as blobHref (blobHref)}
							<tr class="border-b last:border-0">
								<td class="px-4 py-2 font-mono text-xs text-muted-foreground">
									{blobHref.split('/').at(-2)?.slice(0, 12) ?? '—'}
								</td>
								<td class="px-4 py-2 text-muted-foreground">{data.manifest.media_type}</td>
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
</div>
