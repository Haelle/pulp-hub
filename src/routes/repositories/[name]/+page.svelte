<script lang="ts">
	import { Badge } from "$lib/components/ui/badge";
	import PullCommand from "$lib/components/PullCommand.svelte";
	import CliHint from "$lib/components/CliHint.svelte";
	import { dockerHubUrl } from "$lib/utils";
	import Tag from "@lucide/svelte/icons/tag";
	import ExternalLink from "@lucide/svelte/icons/external-link";

	let { data } = $props();

	const shortName = $derived(
		data.distribution.name.split("/").pop() ??
			data.distribution.name,
	);
	const firstTag = $derived(data.tags[0]?.name ?? "latest");
	const hubUrl = $derived(dockerHubUrl(data.distribution.name));
</script>

<div class="mx-auto max-w-4xl p-6 space-y-6">
	<div>
		<div class="flex items-center gap-3">
			<h1 class="text-2xl font-bold">{shortName}</h1>
			<Badge variant="secondary">Container</Badge>
			{#if hubUrl}
				<a href={hubUrl} target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
					<ExternalLink class="size-3.5" />
					Docker Hub
				</a>
			{/if}
		</div>
		<p class="mt-1 text-sm text-muted-foreground font-mono">
			{data.registryPath}
		</p>
	</div>

	<CliHint>
		<span class="text-muted-foreground"
			>Requires chaining 3 API calls:</span
		>
		<ol class="mt-1 list-inside space-y-0.5 text-muted-foreground">
			<li>
				<code class="bg-muted px-1 py-0.5 rounded"
					>pulp container distribution show --name
					"{data.distribution.name}"</code
				><br />
				→ get
				<code class="bg-muted px-1 py-0.5 rounded"
					>repository</code
				> href
			</li>
			<li>
				<code class="bg-muted px-1 py-0.5 rounded"
					>pulp container repository show --href
					&lt;repository&gt;</code
				><br />
				→ get
				<code class="bg-muted px-1 py-0.5 rounded"
					>latest_version_href</code
				>
			</li>
			<li>
				GET<code class="bg-muted px-1 py-0.5 rounded">
					/pulp/api/v3/content/container/tags/?repository_version=&lt;latest_version_href&gt;</code
				>
			</li>
		</ol>
	</CliHint>

	<PullCommand registryPath={data.registryPath} tag={firstTag} />

	{#if data.tags.length > 0}
		<div class="rounded-md border">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b bg-muted/50">
						<th
							class="px-4 py-2 text-left font-medium"
							>Tag</th
						>
						<th
							class="px-4 py-2 text-left font-medium"
							>Digest</th
						>
						<th
							class="px-4 py-2 text-left font-medium"
							>Created</th
						>
					</tr>
				</thead>
				<tbody>
					{#each data.tags as tag (tag.pulp_href)}
						<tr class="border-b last:border-0 hover:bg-muted/50">
							<td class="px-4 py-2">
								<a
									href="/repositories/{encodeURIComponent(data.distribution.name)}/tags/{encodeURIComponent(tag.name)}"
									class="flex items-center gap-2 hover:underline"
								>
									<Tag
										class="size-3.5 text-muted-foreground"
									/>
									{tag.name}
								</a>
							</td>
							<td
								class="px-4 py-2 font-mono text-xs text-muted-foreground"
								title={tag.tagged_manifest}
							>
								{tag.tagged_manifest
									.split(
										"/",
									)
									.at(-2)
									?.slice(
										0,
										12,
									) ??
									"—"}
							</td>
							<td
								class="px-4 py-2 text-muted-foreground"
							>
								{new Date(
									tag.pulp_created,
								).toLocaleDateString()}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<div
			class="flex flex-col items-center justify-center py-16 text-muted-foreground"
		>
			<Tag class="size-12 mb-4" />
			<p>No tags found</p>
		</div>
	{/if}
</div>
