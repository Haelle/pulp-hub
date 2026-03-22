<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import PackageOpen from '@lucide/svelte/icons/package-open';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import CliHint from '$lib/components/CliHint.svelte';
	import Loader from '@lucide/svelte/icons/loader';
	import { getDistributions, type ContainerDistribution } from '$lib/pulp';
	import { upstreamRegistryUrl } from '$lib/utils';

	let filter = $state('');
	let distributions = $state<ContainerDistribution[]>([]);
	let sources = $state<string[]>([]);
	let enabledSources = $state<Set<string>>(new Set());
	let loading = $state(true);
	let error = $state('');

	function getSource(name: string): string {
		const idx = name.indexOf('/');
		return idx > 0 ? name.substring(0, idx) : name;
	}

	async function load() {
		loading = true;
		error = '';
		try {
			const data = await getDistributions(100, 0);
			distributions = data.results;
			const sourceSet = new Set(data.results.map((d) => getSource(d.name)));
			sources = [...sourceSet].sort();
			enabledSources = new Set(sources);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unknown error';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		load();
	});

	const filtered = $derived(
		distributions.filter(
			(d) =>
				enabledSources.has(getSource(d.name)) &&
				(d.name.toLowerCase().includes(filter.toLowerCase()) ||
					d.base_path.toLowerCase().includes(filter.toLowerCase()))
		)
	);

	function toggleSource(name: string) {
		const next = new Set(enabledSources);
		if (next.has(name)) next.delete(name);
		else next.add(name);
		enabledSources = next;
	}

	function shortName(name: string): string {
		return name.split('/').pop() ?? name;
	}
</script>

<div class="mx-auto max-w-6xl p-6 space-y-6">
	<h1 class="text-2xl font-bold">Images</h1>
	<CliHint command="pulp container distribution list" />

	{#if loading}
		<div class="flex justify-center py-16">
			<Loader class="size-8 animate-spin text-muted-foreground" />
		</div>
	{:else if error}
		<p class="text-destructive">{error}</p>
	{:else}
		<div class="flex flex-wrap items-center gap-4">
			<Input placeholder="Filter images..." bind:value={filter} class="max-w-sm" />
			{#if sources.length > 1}
				<div class="flex items-center gap-3">
					{#each sources as source}
						<label class="flex items-center gap-1.5 text-sm cursor-pointer">
							<input
								type="checkbox"
								checked={enabledSources.has(source)}
								onchange={() => toggleSource(source)}
							/>
							{source}
						</label>
					{/each}
				</div>
			{/if}
		</div>

		{#if filtered.length > 0}
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each filtered as dist (dist.pulp_href)}
					{@const upstream = upstreamRegistryUrl(dist.name)}
					<a href="/images/{encodeURIComponent(dist.name)}" class="block">
						<Card.Root class="transition-colors hover:border-ring">
							<Card.Header>
								<div class="flex items-center justify-between">
									<Card.Title class="text-base">{shortName(dist.name)}</Card.Title>
									<Badge variant="secondary">{getSource(dist.name)}</Badge>
								</div>
								<Card.Description>{dist.base_path}</Card.Description>
							</Card.Header>
							{#if upstream}
								<Card.Content>
									<button
										type="button"
										class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
										onclick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(upstream.url, '_blank'); }}
									>
										<ExternalLink class="size-3" />
										{upstream.label}
									</button>
								</Card.Content>
							{/if}
						</Card.Root>
					</a>
				{/each}
			</div>
		{:else}
			<div class="flex flex-col items-center justify-center py-16 text-muted-foreground">
				<PackageOpen class="size-12 mb-4" />
				<p>No images found</p>
			</div>
		{/if}
	{/if}
</div>
