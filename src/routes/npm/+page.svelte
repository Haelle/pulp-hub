<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import PackageOpen from '@lucide/svelte/icons/package-open';
	import CliHint from '$lib/components/CliHint.svelte';
	import Loader from '@lucide/svelte/icons/loader';
	import { getAllNpmPackages, type NpmPackageWithSource } from '$lib/pulp';

	let filter = $state('');
	let packages = $state<NpmPackageWithSource[]>([]);
	let distributions = $state<string[]>([]);
	let enabledDists = $state<Set<string>>(new Set());
	let loading = $state(true);
	let error = $state('');

	async function load() {
		loading = true;
		error = '';
		try {
			const data = await getAllNpmPackages();
			packages = data.packages;
			distributions = data.distributions;
			enabledDists = new Set(data.distributions);
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
		packages.filter(
			(p) =>
				enabledDists.has(p.distribution) &&
				(p.name.toLowerCase().includes(filter.toLowerCase()) ||
					p.version.includes(filter))
		)
	);

	function toggleDist(name: string) {
		const next = new Set(enabledDists);
		if (next.has(name)) {
			next.delete(name);
		} else {
			next.add(name);
		}
		enabledDists = next;
	}
</script>

<div class="mx-auto max-w-6xl p-6 space-y-6">
	<h1 class="text-2xl font-bold">npm Packages</h1>
	<CliHint>
		<code class="bg-muted px-1.5 py-0.5 rounded">GET /pulp/api/v3/content/npm/packages/</code>
		— pulp-cli does not support npm, use the REST API directly.
	</CliHint>

	{#if loading}
		<div class="flex justify-center py-16">
			<Loader class="size-8 animate-spin text-muted-foreground" />
		</div>
	{:else if error}
		<p class="text-destructive">{error}</p>
	{:else}
		<div class="flex flex-wrap items-center gap-4">
			<Input placeholder="Filter packages..." bind:value={filter} class="max-w-sm" />
			{#if distributions.length > 1}
				<div class="flex items-center gap-3">
					{#each distributions as dist}
						<label class="flex items-center gap-1.5 text-sm cursor-pointer">
							<input
								type="checkbox"
								checked={enabledDists.has(dist)}
								onchange={() => toggleDist(dist)}
							/>
							{dist}
						</label>
					{/each}
				</div>
			{/if}
		</div>

		{#if filtered.length > 0}
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each filtered as pkg (pkg.pulp_href)}
					<a href="/npm/packages/{encodeURIComponent(`${pkg.name}@${pkg.version}`)}" class="block" data-testid="npm-package-card">
						<Card.Root class="transition-colors hover:border-ring">
							<Card.Header>
								<div class="flex items-center justify-between">
									<Card.Title class="text-base font-mono">{pkg.name}</Card.Title>
									<Badge variant="secondary">{pkg.distribution}</Badge>
								</div>
								<Card.Description>{pkg.version}</Card.Description>
							</Card.Header>
						</Card.Root>
					</a>
				{/each}
			</div>
		{:else}
			<div class="flex flex-col items-center justify-center py-16 text-muted-foreground">
				<PackageOpen class="size-12 mb-4" />
				<p>No npm packages found</p>
			</div>
		{/if}
	{/if}
</div>
