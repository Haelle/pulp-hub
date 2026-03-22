<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import type { ContainerDistribution } from '$lib/pulp';
	import { upstreamRegistryUrl } from '$lib/utils';
	import ExternalLink from '@lucide/svelte/icons/external-link';

	let { distribution }: { distribution: ContainerDistribution } = $props();

	const name = $derived(distribution.name.split('/').pop() ?? distribution.name);
	const upstream = $derived(upstreamRegistryUrl(distribution.name));
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
		{#if upstream}
			<Card.Content>
				<button
					type="button"
					class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
					onclick={(e) => {
						e.preventDefault();
						e.stopPropagation();
						window.open(upstream.url, '_blank');
					}}
				>
					<ExternalLink class="size-3" />
					{upstream.label}
				</button>
			</Card.Content>
		{/if}
	</Card.Root>
</a>
