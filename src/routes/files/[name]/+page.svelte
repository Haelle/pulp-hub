<script lang="ts">
	import { page } from '$app/stores';
	import { Badge } from '$lib/components/ui/badge';
	import CliHint from '$lib/components/CliHint.svelte';
	import Loader from '@lucide/svelte/icons/loader';
	import FileIcon from '@lucide/svelte/icons/file';
	import {
		getFileDistribution,
		getFileRepository,
		getFileContents,
		type FileDistribution,
		type FileContent
	} from '$lib/pulp';

	let distribution = $state<FileDistribution | null>(null);
	let files = $state<FileContent[]>([]);
	let loading = $state(true);
	let error = $state('');
	let notFound = $state(false);

	$effect(() => {
		const name = decodeURIComponent($page.params.name!);
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
				files = contentsData.results.sort((a, b) => a.relative_path.localeCompare(b.relative_path));
			} catch (e) {
				error = e instanceof Error ? e.message : 'Unknown error';
			} finally {
				loading = false;
			}
		})();
	});
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
				<Badge variant="secondary">File</Badge>
			</div>
			{#if distribution.base_url}
				<p class="mt-1 text-sm text-muted-foreground font-mono">
					{distribution.base_url}
				</p>
			{/if}
		</div>

		<CliHint>
			<span class="text-muted-foreground">Requires chaining 3 API calls:</span>
			<ol class="mt-1 list-inside space-y-0.5 text-muted-foreground">
				<li>
					<code class="bg-muted px-1 py-0.5 rounded"
						>pulp file distribution show --name "{distribution.name}"</code
					><br />
					→ get <code class="bg-muted px-1 py-0.5 rounded">repository</code> href
				</li>
				<li>
					<code class="bg-muted px-1 py-0.5 rounded"
						>pulp file repository show --href &lt;repository&gt;</code
					><br />
					→ get <code class="bg-muted px-1 py-0.5 rounded">latest_version_href</code>
				</li>
				<li>
					GET<code class="bg-muted px-1 py-0.5 rounded">
						/pulp/api/v3/content/file/files/?repository_version=&lt;latest_version_href&gt;</code
					>
				</li>
			</ol>
		</CliHint>

		{#if files.length > 0}
			<div class="rounded-md border">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b bg-muted/50">
							<th class="px-4 py-2 text-left font-medium">Path</th>
							<th class="px-4 py-2 text-left font-medium">SHA256</th>
						</tr>
					</thead>
					<tbody>
						{#each files as file (file.pulp_href)}
							<tr class="border-b last:border-0 hover:bg-muted/50">
								<td class="px-4 py-2">
									<a
										href="/files/{encodeURIComponent(
											distribution.name
										)}/content/{file.relative_path}"
										class="flex items-center gap-2 hover:underline"
									>
										<FileIcon class="size-3.5 text-muted-foreground" />
										{file.relative_path}
									</a>
								</td>
								<td class="px-4 py-2 font-mono text-xs text-muted-foreground" title={file.sha256}>
									{file.sha256.slice(0, 12)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<div class="flex flex-col items-center justify-center py-16 text-muted-foreground">
				<FileIcon class="size-12 mb-4" />
				<p>No files found</p>
			</div>
		{/if}
	{/if}
</div>
