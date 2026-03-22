<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import type { NpmDistribution } from '$lib/pulp';

	let { distribution }: { distribution: NpmDistribution } = $props();
</script>

<a href="/npm/{encodeURIComponent(distribution.name)}" class="block">
	<Card.Root class="transition-colors hover:border-ring">
		<Card.Header>
			<div class="flex items-center justify-between">
				<Card.Title class="text-base">{distribution.name}</Card.Title>
				<Badge variant="secondary">npm</Badge>
			</div>
			<Card.Description>{distribution.base_path}</Card.Description>
		</Card.Header>
	</Card.Root>
</a>
