<script lang="ts">
	import { page } from '$app/stores';
	import { Badge } from '$lib/components/ui/badge';
	import CopyBlock from '$lib/components/CopyBlock.svelte';
	import Loader from '@lucide/svelte/icons/loader';
	import { auth } from '$lib/auth.svelte';
	import {
		getAllNpmPackages,
		type NpmPackageWithSource
	} from '$lib/pulp';

	let pkg = $state<NpmPackageWithSource | null>(null);
	let otherVersions = $state<NpmPackageWithSource[]>([]);
	let loading = $state(true);
	let notFound = $state(false);

	const pulpHost = $derived(auth.pulpUrl);

	$effect(() => {
		const slug = decodeURIComponent($page.params.slug);
		load(slug);
	});

	async function load(slug: string) {
		loading = true;
		notFound = false;
		try {
			const atIdx = slug.lastIndexOf('@');
			if (atIdx <= 0) {
				notFound = true;
				return;
			}
			const name = slug.substring(0, atIdx);
			const version = slug.substring(atIdx + 1);

			const data = await getAllNpmPackages();
			const match = data.packages.find((p) => p.name === name && p.version === version);
			if (!match) {
				notFound = true;
				return;
			}
			pkg = match;
			otherVersions = data.packages.filter(
				(p) => p.name === name && p.version !== version
			);
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
	{:else if pkg}
		<div>
			<div class="flex items-center gap-3">
				<h1 class="text-2xl font-bold font-mono">{pkg.name}</h1>
				<Badge variant="secondary">{pkg.version}</Badge>
			</div>
			<p class="mt-1 text-sm text-muted-foreground">
				Source: <span class="font-mono">{pkg.distribution}</span>
			</p>
		</div>

		<div class="space-y-4">
			<div class="rounded-md border p-4 space-y-2">
				<p class="text-sm font-medium text-muted-foreground">Tarball</p>
				<p class="text-sm font-mono">{pkg.relative_path}</p>
			</div>

			<CopyBlock
				label="Install"
				code="npm install {pkg.name}@{pkg.version} --registry={pulpHost}/pulp/content/{pkg.distribution}/"
			/>
		</div>

		{#if otherVersions.length > 0}
			<div class="space-y-3">
				<h2 class="text-lg font-semibold">Other cached versions</h2>
				<div class="flex flex-wrap gap-2">
					{#each otherVersions as v (v.pulp_href)}
						<a
							href="/npm/packages/{encodeURIComponent(`${v.name}@${v.version}`)}"
							class="inline-block"
						>
							<Badge variant="outline" class="hover:bg-muted cursor-pointer">{v.version}</Badge>
						</a>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>
