<script lang="ts">
	import { page } from '$app/stores';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import CliHint from '$lib/components/CliHint.svelte';
	import Loader from '@lucide/svelte/icons/loader';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';
	import { formatBytes } from '$lib/utils';
	import {
		getFileDistribution,
		getFileRepository,
		getFileContents,
		getArtifact,
		type FileDistribution,
		type FileContent,
		type PulpArtifact
	} from '$lib/pulp';

	let distribution = $state<FileDistribution | null>(null);
	let content = $state<FileContent | null>(null);
	let artifact = $state<PulpArtifact | null>(null);
	let loading = $state(true);
	let error = $state('');
	let notFound = $state(false);
	let copiedSha = $state(false);
	let copiedUrl = $state(false);

	$effect(() => {
		const params = $page.params as { name: string; path: string };
		const name = decodeURIComponent(params.name);
		const relativePath = params.path;
		loading = true;
		error = '';
		notFound = false;

		(async () => {
			try {
				const dist = await getFileDistribution(name);
				if (!dist) {
					notFound = true;
					return;
				}
				distribution = dist;

				const repo = await getFileRepository(dist.repository);
				const contentsData = await getFileContents(repo.latest_version_href);
				const match = contentsData.results.find((c) => c.relative_path === relativePath);
				if (!match) {
					notFound = true;
					return;
				}
				content = match;
				artifact = await getArtifact(match.artifact);
			} catch (e) {
				error = e instanceof Error ? e.message : 'Unknown error';
			} finally {
				loading = false;
			}
		})();
	});

	async function copySha256() {
		if (!content) return;
		await navigator.clipboard.writeText(content.sha256);
		copiedSha = true;
		setTimeout(() => (copiedSha = false), 2000);
	}

	const downloadUrl = $derived(
		distribution?.base_url && content
			? `${distribution.base_url.replace(/\/$/, '')}/${content.relative_path}`
			: null
	);

	async function copyDownloadUrl() {
		if (!downloadUrl) return;
		await navigator.clipboard.writeText(downloadUrl);
		copiedUrl = true;
		setTimeout(() => (copiedUrl = false), 2000);
	}
</script>

<div class="mx-auto max-w-4xl p-6 space-y-6">
	{#if loading}
		<div class="flex justify-center py-16">
			<Loader class="size-8 animate-spin text-muted-foreground" />
		</div>
	{:else if notFound}
		<p class="text-destructive">File not found</p>
	{:else if error}
		<p class="text-destructive">{error}</p>
	{:else if content && distribution}
		<div>
			<div class="flex items-center gap-3">
				<h1 class="text-2xl font-bold">{content.relative_path}</h1>
				<Badge variant="secondary">File</Badge>
			</div>
			<p class="mt-1 text-sm text-muted-foreground">
				<a href="/files/{encodeURIComponent(distribution.name)}" class="hover:underline">
					{distribution.name}
				</a>
			</p>
		</div>

		<CliHint
			command={`pulp file content list --relative-path "${content.relative_path}" --repository-version <latest_version_href>`}
		/>

		<div class="space-y-4">
			<div class="rounded-md border p-4 space-y-3">
				<div>
					<span class="text-sm font-medium">SHA256</span>
					<div class="flex items-center gap-2 mt-1">
						<code class="flex-1 text-xs font-mono bg-muted px-2 py-1 rounded break-all">
							{content.sha256}
						</code>
						<Button variant="ghost" size="icon-sm" onclick={copySha256} aria-label="Copy SHA256">
							{#if copiedSha}
								<Check class="size-4 text-green-500" />
							{:else}
								<Copy class="size-4" />
							{/if}
						</Button>
					</div>
				</div>

				{#if artifact}
					<div>
						<span class="text-sm font-medium">Size</span>
						<p class="text-sm text-muted-foreground mt-1">{formatBytes(artifact.size)}</p>
					</div>
				{/if}

				{#if downloadUrl}
					<div>
						<span class="text-sm font-medium">Download URL</span>
						<div
							class="flex items-center gap-2 mt-1 rounded-md border border-border bg-muted px-3 py-2"
						>
							<code class="flex-1 text-sm font-mono truncate">{downloadUrl}</code>
							<Button
								variant="ghost"
								size="icon-sm"
								onclick={copyDownloadUrl}
								aria-label="Copy download URL"
							>
								{#if copiedUrl}
									<Check class="size-4 text-green-500" />
								{:else}
									<Copy class="size-4" />
								{/if}
							</Button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
