<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import type { ContainerDistribution } from '$lib/pulp';
	import { dockerHubUrl } from '$lib/utils';
	import { auth } from '$lib/auth.svelte';
	import ExternalLink from '@lucide/svelte/icons/external-link';

	let { distribution }: { distribution: ContainerDistribution } = $props();

	const name = $derived(distribution.name.split('/').pop() ?? distribution.name);
	const hubUrl = $derived(dockerHubUrl(distribution.name));
	const pulpHost = $derived(new URL(auth.pulpUrl).host);
</script>

<a href="/repositories/{encodeURIComponent(distribution.name)}" class="block">
	<Card.Root class="transition-colors hover:border-ring">
		<Card.Header>
			<div class="flex items-center justify-between">
				<Card.Title class="text-base">{name}</Card.Title>
				<Badge variant="secondary">Container</Badge>
			</div>
			<Card.Description>{distribution.base_path}</Card.Description>
		</Card.Header>
		<Card.Content>
			<p class="text-xs font-mono text-muted-foreground truncate">{pulpHost}/{distribution.base_path}</p>
			{#if hubUrl}
				<button type="button" class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1 cursor-pointer" onclick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(hubUrl, '_blank'); }}>
					<ExternalLink class="size-3" />
					Docker Hub
				</button>
			{/if}
		</Card.Content>
	</Card.Root>
</a>
