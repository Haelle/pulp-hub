<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import RepoCard from '$lib/components/RepoCard.svelte';
	import PackageOpen from '@lucide/svelte/icons/package-open';
	import CliHint from '$lib/components/CliHint.svelte';

	let { data } = $props();

	let filter = $state('');

	const filtered = $derived(
		data.distributions.results.filter(
			(d) =>
				d.name.toLowerCase().includes(filter.toLowerCase()) ||
				d.base_path.toLowerCase().includes(filter.toLowerCase())
		)
	);

	const hasPrev = $derived(data.offset > 0);
	const hasNext = $derived(data.distributions.next !== null);
</script>

<div class="mx-auto max-w-6xl p-6 space-y-6">
	<h1 class="text-2xl font-bold">Repositories</h1>
	<CliHint command="pulp container distribution list" />

	<Input
		placeholder="Filter repositories..."
		bind:value={filter}
		class="max-w-sm"
	/>

	{#if filtered.length > 0}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each filtered as distribution (distribution.pulp_href)}
				<RepoCard {distribution} pulpHost={data.pulpHost} />
			{/each}
		</div>
	{:else}
		<div class="flex flex-col items-center justify-center py-16 text-muted-foreground">
			<PackageOpen class="size-12 mb-4" />
			<p>No repositories found</p>
		</div>
	{/if}

	{#if data.distributions.count > data.limit}
		<div class="flex items-center justify-center gap-2">
			<Button
				variant="outline"
				size="sm"
				disabled={!hasPrev}
				href="/repositories?offset={data.offset - data.limit}"
			>
				Previous
			</Button>
			<span class="text-sm text-muted-foreground">
				{data.offset + 1}–{Math.min(data.offset + data.limit, data.distributions.count)} of {data.distributions.count}
			</span>
			<Button
				variant="outline"
				size="sm"
				disabled={!hasNext}
				href="/repositories?offset={data.offset + data.limit}"
			>
				Next
			</Button>
		</div>
	{/if}
</div>
