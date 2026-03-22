<script lang="ts">
	import { page } from '$app/stores';
	import { Badge } from '$lib/components/ui/badge';
	import PullCommand from '$lib/components/PullCommand.svelte';
	import CliHint from '$lib/components/CliHint.svelte';
	import { upstreamRegistryUrl } from '$lib/utils';
	import Tag from '@lucide/svelte/icons/tag';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Loader from '@lucide/svelte/icons/loader';
	import {
		getDistribution,
		getRepository,
		getTags,
		type ContainerDistribution,
		type ContainerTag
	} from '$lib/pulp';

	let distribution = $state<ContainerDistribution | null>(null);
	let tags = $state<ContainerTag[]>([]);
	let loading = $state(true);
	let error = $state('');
	let notFound = $state(false);

	$effect(() => {
		const name = decodeURIComponent($page.params.name!);
		loading = true;
		error = '';
		notFound = false;

		(async () => {
			try {
				const dist = await getDistribution(name);
				if (!dist) {
					notFound = true;
					return;
				}
				distribution = dist;

				const repo = await getRepository(dist.repository);
				const tagsData = await getTags(repo.latest_version_href);
				tags = tagsData.results.sort(
					(a, b) => new Date(b.pulp_created).getTime() - new Date(a.pulp_created).getTime()
				);
			} catch (e) {
				error = e instanceof Error ? e.message : 'Unknown error';
			} finally {
				loading = false;
			}
		})();
	});

	const shortName = $derived(distribution?.name.split('/').pop() ?? distribution?.name ?? '');
	const firstTag = $derived(tags[0]?.name ?? 'latest');
	const upstream = $derived(distribution ? upstreamRegistryUrl(distribution.name) : null);
</script>

<div class="mx-auto max-w-4xl p-6 space-y-6">
	{#if loading}
		<div class="flex justify-center py-16">
			<Loader class="size-8 animate-spin text-muted-foreground" />
		</div>
	{:else if notFound}
		<p class="text-destructive">Distribution not found</p>
	{:else if error}
		<p class="text-destructive">{error}</p>
	{:else if distribution}
		<div>
			<div class="flex items-center gap-3">
				<h1 class="text-2xl font-bold">{shortName}</h1>
				<Badge variant="secondary">Container</Badge>
				{#if upstream}
					<a
						href={upstream.url}
						target="_blank"
						rel="noopener"
						class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
					>
						<ExternalLink class="size-3.5" />
						{upstream.label}
					</a>
				{/if}
			</div>
			<p class="mt-1 text-sm text-muted-foreground font-mono">
				{distribution.base_path}
			</p>
		</div>

		<CliHint>
			<span class="text-muted-foreground">Requires chaining 3 API calls:</span>
			<ol class="mt-1 list-inside space-y-0.5 text-muted-foreground">
				<li>
					<code class="bg-muted px-1 py-0.5 rounded"
						>pulp container distribution show --name "{distribution.name}"</code
					><br />
					→ get
					<code class="bg-muted px-1 py-0.5 rounded">repository</code> href
				</li>
				<li>
					<code class="bg-muted px-1 py-0.5 rounded"
						>pulp container repository show --href &lt;repository&gt;</code
					><br />
					→ get
					<code class="bg-muted px-1 py-0.5 rounded">latest_version_href</code>
				</li>
				<li>
					GET<code class="bg-muted px-1 py-0.5 rounded">
						/pulp/api/v3/content/container/tags/?repository_version=&lt;latest_version_href&gt;</code
					>
				</li>
			</ol>
		</CliHint>

		<PullCommand basePath={distribution.base_path} tag={firstTag} />

		{#if tags.length > 0}
			<div class="rounded-md border">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b bg-muted/50">
							<th class="px-4 py-2 text-left font-medium">Tag</th>
							<th class="px-4 py-2 text-left font-medium">Digest</th>
							<th class="px-4 py-2 text-left font-medium">Created</th>
						</tr>
					</thead>
					<tbody>
						{#each tags as tag (tag.pulp_href)}
							<tr class="border-b last:border-0 hover:bg-muted/50">
								<td class="px-4 py-2">
									<a
										href="/repositories/{encodeURIComponent(
											distribution.name
										)}/tags/{encodeURIComponent(tag.name)}"
										class="flex items-center gap-2 hover:underline"
									>
										<Tag class="size-3.5 text-muted-foreground" />
										{tag.name}
									</a>
								</td>
								<td
									class="px-4 py-2 font-mono text-xs text-muted-foreground"
									title={tag.tagged_manifest}
								>
									{tag.tagged_manifest.split('/').at(-2)?.slice(0, 12) ?? '—'}
								</td>
								<td class="px-4 py-2 text-muted-foreground">
									{new Date(tag.pulp_created).toLocaleDateString()}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<div class="flex flex-col items-center justify-center py-16 text-muted-foreground">
				<Tag class="size-12 mb-4" />
				<p>No tags found</p>
			</div>
		{/if}
	{/if}
</div>
