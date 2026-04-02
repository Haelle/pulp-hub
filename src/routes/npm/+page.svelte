<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import PackageOpen from '@lucide/svelte/icons/package-open';
	import CliHint from '$lib/components/CliHint.svelte';
	import Loader from '@lucide/svelte/icons/loader';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import { getAllNpmPackages, type NpmPackageGroup } from '$lib/pulp';

	let filter = $state('');
	let groups = $state<NpmPackageGroup[]>([]);
	let distributions = $state<string[]>([]);
	let enabledDists = new SvelteSet<string>();
	let loading = $state(true);
	let error = $state('');

	async function load() {
		loading = true;
		error = '';
		try {
			const data = await getAllNpmPackages();
			distributions = data.distributions;
			enabledDists.clear();
			data.distributions.forEach((d) => enabledDists.add(d));

			// Group packages by name
			const map = new SvelteMap<string, NpmPackageGroup>();
			for (const pkg of data.packages) {
				const existing = map.get(pkg.name);
				if (existing) {
					existing.versions.push(pkg);
					// Keep the highest version as latest (simple string compare)
					if (pkg.version > existing.latestVersion) {
						existing.latestVersion = pkg.version;
					}
				} else {
					map.set(pkg.name, {
						name: pkg.name,
						latestVersion: pkg.version,
						distribution: pkg.distribution,
						versions: [pkg]
					});
				}
			}
			groups = [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
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
		groups.filter(
			(g) => enabledDists.has(g.distribution) && g.name.toLowerCase().includes(filter.toLowerCase())
		)
	);

	function toggleDist(name: string) {
		if (enabledDists.has(name)) enabledDists.delete(name);
		else enabledDists.add(name);
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
			<div class="flex flex-wrap items-center gap-3">
				{#each distributions as dist (dist)}
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
		</div>

		{#if filtered.length > 0}
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each filtered as group (group.name)}
					<a
						href="/npm/packages/{encodeURIComponent(group.name)}"
						class="block"
						data-testid="npm-package-card"
					>
						<Card.Root class="transition-colors hover:border-ring">
							<Card.Header>
								<div class="flex items-center justify-between">
									<Card.Title class="text-base font-mono">{group.name}</Card.Title>
									<Badge variant="secondary">{group.distribution}</Badge>
								</div>
								<Card.Description
									>{group.latestVersion} · {group.versions.length} version{group.versions.length > 1
										? 's'
										: ''}</Card.Description
								>
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
