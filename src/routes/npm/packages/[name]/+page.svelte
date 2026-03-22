<script lang="ts">
	import { page } from '$app/stores';
	import { Badge } from '$lib/components/ui/badge';
	import CopyBlock from '$lib/components/CopyBlock.svelte';
	import Loader from '@lucide/svelte/icons/loader';
	import { auth } from '$lib/auth.svelte';
	import { getAllNpmPackages, type NpmPackageWithSource } from '$lib/pulp';

	let packageName = $state('');
	let versions = $state<NpmPackageWithSource[]>([]);
	let distribution = $state('');
	let loading = $state(true);
	let notFound = $state(false);

	const pulpHost = $derived(auth.pulpUrl);
	const registryUrl = $derived(distribution ? `${pulpHost}/pulp/content/${distribution}/` : '');

	$effect(() => {
		const name = decodeURIComponent($page.params.name);
		load(name);
	});

	async function load(name: string) {
		loading = true;
		notFound = false;
		try {
			const data = await getAllNpmPackages();
			const matching = data.packages.filter((p) => p.name === name);
			if (matching.length === 0) {
				notFound = true;
				return;
			}
			packageName = name;
			versions = matching.sort((a, b) => b.version.localeCompare(a.version));
			distribution = matching[0].distribution;
		} catch {
			notFound = true;
		} finally {
			loading = false;
		}
	}
</script>

<div class="mx-auto max-w-4xl p-6 space-y-6">
	{#if loading}
		<div class="flex justify-center py-16">
			<Loader class="size-8 animate-spin text-muted-foreground" />
		</div>
	{:else if notFound}
		<p class="text-destructive">Package not found</p>
	{:else}
		<div>
			<h1 class="text-2xl font-bold font-mono">{packageName}</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				Source: <span class="font-mono">{distribution}</span>
				· {versions.length} cached version{versions.length > 1 ? 's' : ''}
			</p>
		</div>

		<CopyBlock
			label="Install latest cached version"
			code="npm install {packageName}@{versions[0].version} --registry={registryUrl}"
		/>

		<div class="space-y-3">
			<h2 class="text-lg font-semibold">Cached versions</h2>
			<div class="rounded-md border">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b bg-muted/50">
							<th class="px-4 py-2 text-left font-medium">Version</th>
							<th class="px-4 py-2 text-left font-medium">Tarball</th>
						</tr>
					</thead>
					<tbody>
						{#each versions as v (v.pulp_href)}
							<tr class="border-b last:border-0">
								<td class="px-4 py-2 font-mono">
									<Badge variant={v === versions[0] ? 'default' : 'outline'}>{v.version}</Badge>
								</td>
								<td class="px-4 py-2 text-muted-foreground font-mono text-xs">{v.relative_path}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
