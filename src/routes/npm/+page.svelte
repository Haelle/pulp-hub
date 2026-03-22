<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import NpmCard from '$lib/components/NpmCard.svelte';
	import PackageOpen from '@lucide/svelte/icons/package-open';
	import CliHint from '$lib/components/CliHint.svelte';
	import Loader from '@lucide/svelte/icons/loader';
	import { getNpmRepoDistributions, type PulpPaginated, type NpmDistribution } from '$lib/pulp';

	const limit = 20;
	let offset = $state(0);
	let filter = $state('');
	let distributions = $state<PulpPaginated<NpmDistribution> | null>(null);
	let loading = $state(true);
	let error = $state('');

	async function load() {
		loading = true;
		error = '';
		try {
			distributions = await getNpmRepoDistributions(limit, offset);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unknown error';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		void offset;
		load();
	});

	const filtered = $derived(
		distributions?.results.filter(
			(d) =>
				d.name.toLowerCase().includes(filter.toLowerCase()) ||
				d.base_path.toLowerCase().includes(filter.toLowerCase())
		) ?? []
	);

	const hasPrev = $derived(offset > 0);
	const hasNext = $derived(distributions?.next !== null);
</script>

<div class="mx-auto max-w-6xl p-6 space-y-6">
	<h1 class="text-2xl font-bold">npm Repositories</h1>
	<CliHint>
		<code class="bg-muted px-1.5 py-0.5 rounded">GET /pulp/api/v3/distributions/npm/npm/</code>
		— pulp-cli does not support npm, use the REST API directly.
	</CliHint>

	{#if loading}
		<div class="flex justify-center py-16">
			<Loader class="size-8 animate-spin text-muted-foreground" />
		</div>
	{:else if error}
		<p class="text-destructive">{error}</p>
	{:else}
		<Input placeholder="Filter npm repositories..." bind:value={filter} class="max-w-sm" />

		{#if filtered.length > 0}
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each filtered as distribution (distribution.pulp_href)}
					<NpmCard {distribution} />
				{/each}
			</div>
		{:else}
			<div class="flex flex-col items-center justify-center py-16 text-muted-foreground">
				<PackageOpen class="size-12 mb-4" />
				<p>No npm repositories found</p>
			</div>
		{/if}

		{#if distributions && distributions.count > limit}
			<div class="flex items-center justify-center gap-2">
				<Button
					variant="outline"
					size="sm"
					disabled={!hasPrev}
					onclick={() => (offset = Math.max(0, offset - limit))}
				>
					Previous
				</Button>
				<span class="text-sm text-muted-foreground">
					{offset + 1}–{Math.min(offset + limit, distributions.count)} of {distributions.count}
				</span>
				<Button variant="outline" size="sm" disabled={!hasNext} onclick={() => (offset += limit)}>
					Next
				</Button>
			</div>
		{/if}
	{/if}
</div>
