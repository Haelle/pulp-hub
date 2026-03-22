<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import PullThroughCard from '$lib/components/PullThroughCard.svelte';
	import PackageOpen from '@lucide/svelte/icons/package-open';
	import Loader from '@lucide/svelte/icons/loader';
	import CliHint from '$lib/components/CliHint.svelte';
	import {
		getStatus,
		getContainerPullThroughDistributions,
		getPythonDistributions,
		getNpmDistributions,
		getRemote,
		type PullThroughRemote
	} from '$lib/pulp';

	interface PullThroughEntry {
		name: string;
		basePath: string;
		upstreamUrl: string;
		type: 'Container' | 'PyPI' | 'npm';
	}

	let filter = $state('');
	let entries = $state<PullThroughEntry[]>([]);
	let loading = $state(true);
	let error = $state('');

	async function load() {
		loading = true;
		error = '';
		try {
			const status = await getStatus();
			const plugins = status.versions.map((v) => v.component);
			const all: PullThroughEntry[] = [];

			// Container pull-through (dedicated endpoint)
			if (plugins.includes('container')) {
				try {
					const data = await getContainerPullThroughDistributions();
					const remoteCache = new Map<string, PullThroughRemote>();

					for (const dist of data.results) {
						let remote = remoteCache.get(dist.remote);
						if (!remote) {
							remote = await getRemote(dist.remote);
							remoteCache.set(dist.remote, remote);
						}
						all.push({
							name: dist.name,
							basePath: dist.base_path,
							upstreamUrl: remote.url,
							type: 'Container'
						});
					}
				} catch {
					// endpoint may not exist if plugin too old
				}
			}

			// Python pull-through (distributions with a remote = pull-through)
			if (plugins.includes('python')) {
				try {
					const data = await getPythonDistributions();
					for (const dist of data.results) {
						if (!dist.remote) continue;
						let remote: PullThroughRemote;
						try {
							remote = await getRemote(dist.remote);
						} catch {
							continue;
						}
						all.push({
							name: dist.name,
							basePath: dist.base_path,
							upstreamUrl: remote.url,
							type: 'PyPI'
						});
					}
				} catch {
					// plugin endpoint unavailable
				}
			}

			// npm pull-through (distributions with a remote = pull-through)
			if (plugins.includes('npm')) {
				try {
					const data = await getNpmDistributions();
					for (const dist of data.results) {
						if (!dist.remote) continue;
						let remote: PullThroughRemote;
						try {
							remote = await getRemote(dist.remote);
						} catch {
							continue;
						}
						all.push({
							name: dist.name,
							basePath: dist.base_path,
							upstreamUrl: remote.url,
							type: 'npm'
						});
					}
				} catch {
					// plugin endpoint unavailable
				}
			}

			entries = all;
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
		entries.filter(
			(e) =>
				e.name.toLowerCase().includes(filter.toLowerCase()) ||
				e.upstreamUrl.toLowerCase().includes(filter.toLowerCase()) ||
				e.type.toLowerCase().includes(filter.toLowerCase())
		)
	);
</script>

<div class="mx-auto max-w-6xl p-6 space-y-6">
	<h1 class="text-2xl font-bold">Pull-through Caches</h1>
	<CliHint>
		Pull-through caching is configured via the Pulp REST API.
		<code class="bg-muted px-1.5 py-0.5 rounded"
			>GET /pulp/api/v3/distributions/container/pull-through/</code
		>
	</CliHint>

	{#if loading}
		<div class="flex justify-center py-16">
			<Loader class="size-8 animate-spin text-muted-foreground" />
		</div>
	{:else if error}
		<p class="text-destructive">{error}</p>
	{:else}
		<Input placeholder="Filter pull-through caches..." bind:value={filter} class="max-w-sm" />

		{#if filtered.length > 0}
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each filtered as entry (entry.name)}
					<PullThroughCard
						name={entry.name}
						upstreamUrl={entry.upstreamUrl}
						type={entry.type}
					/>
				{/each}
			</div>
		{:else}
			<div
				class="flex flex-col items-center justify-center py-16 text-muted-foreground"
			>
				<PackageOpen class="size-12 mb-4" />
				<p>No pull-through caches found</p>
			</div>
		{/if}
	{/if}
</div>
