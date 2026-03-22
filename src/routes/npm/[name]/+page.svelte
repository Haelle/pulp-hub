<script lang="ts">
	import { page } from '$app/stores';
	import { Badge } from '$lib/components/ui/badge';
	import CliHint from '$lib/components/CliHint.svelte';
	import CopyBlock from '$lib/components/CopyBlock.svelte';
	import Loader from '@lucide/svelte/icons/loader';
	import { auth } from '$lib/auth.svelte';
	import {
		getNpmDistribution,
		getNpmRemote,
		getNpmRepository,
		getNpmPackages,
		type NpmDistribution,
		type NpmRemote,
		type NpmPackage
	} from '$lib/pulp';

	let distribution = $state<NpmDistribution | null>(null);
	let remote = $state<NpmRemote | null>(null);
	let packages = $state<NpmPackage[]>([]);
	let loading = $state(true);
	let error = $state('');
	let notFound = $state(false);

	const pulpHost = $derived(auth.pulpUrl);
	const registryUrl = $derived(distribution ? `${pulpHost}/pulp/content/${distribution.base_path}/` : '');

	$effect(() => {
		const name = decodeURIComponent($page.params.name);
		load(name);
	});

	async function load(name: string) {
		loading = true;
		error = '';
		notFound = false;
		try {
			const dist = await getNpmDistribution(name);
			if (!dist) {
				notFound = true;
				return;
			}
			distribution = dist;

			if (dist.remote) {
				remote = await getNpmRemote(dist.remote);
			}

			if (dist.repository) {
				const repo = await getNpmRepository(dist.repository);
				const pkgData = await getNpmPackages(repo.latest_version_href);
				packages = pkgData.results;
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unknown error';
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
		<p class="text-destructive">Distribution not found</p>
	{:else if error}
		<p class="text-destructive">{error}</p>
	{:else if distribution}
		<div>
			<div class="flex items-center gap-3">
				<h1 class="text-2xl font-bold">{distribution.name}</h1>
				<Badge variant="secondary">npm</Badge>
			</div>
			{#if remote}
				<p class="mt-1 text-sm text-muted-foreground">
					Upstream: <span class="font-mono">{remote.url}</span>
				</p>
			{/if}
		</div>

		<CliHint>
			<code class="bg-muted px-1.5 py-0.5 rounded">GET /pulp/api/v3/distributions/npm/npm/?name={distribution.name}</code>
			— pulp-cli does not support npm, use the REST API directly.
		</CliHint>

		<div class="space-y-4">
			<h2 class="text-lg font-semibold">Registry configuration</h2>

			<CopyBlock
				label="npm install with registry"
				code="npm install <package> --registry={registryUrl}"
			/>

			<CopyBlock label=".npmrc" code="registry={registryUrl}" />

			<CopyBlock label="pnpm" code="pnpm install <package> --registry={registryUrl}" />

			<CopyBlock label="yarn (.yarnrc.yml)" code={'npmRegistryServer: "' + registryUrl + '"'} />
		</div>

		{#if packages.length > 0}
			<div class="space-y-4">
				<h2 class="text-lg font-semibold">Cached packages</h2>
				<div class="rounded-md border">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b bg-muted/50">
								<th class="px-4 py-2 text-left font-medium">Package</th>
								<th class="px-4 py-2 text-left font-medium">Version</th>
							</tr>
						</thead>
						<tbody>
							{#each packages as pkg (pkg.pulp_href)}
								<tr class="border-b last:border-0">
									<td class="px-4 py-2 font-mono">{pkg.name}</td>
									<td class="px-4 py-2 text-muted-foreground">{pkg.version}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	{/if}
</div>
