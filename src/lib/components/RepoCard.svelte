<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import type { ContainerDistribution } from '$lib/pulp';

	let { distribution }: { distribution: ContainerDistribution } = $props();

	const name = $derived(distribution.name.split('/').pop() ?? distribution.name);
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
			<p class="text-xs font-mono text-muted-foreground truncate">{distribution.registry_path}</p>
		</Card.Content>
	</Card.Root>
</a>
