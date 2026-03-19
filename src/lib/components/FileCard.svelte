<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import type { FileDistribution } from '$lib/pulp';

	let { distribution }: { distribution: FileDistribution } = $props();
</script>

<a href="/files/{encodeURIComponent(distribution.name)}" class="block">
	<Card.Root class="transition-colors hover:border-ring">
		<Card.Header>
			<div class="flex items-center justify-between">
				<Card.Title class="text-base">{distribution.name}</Card.Title>
				<Badge variant="secondary">File</Badge>
			</div>
			<Card.Description>{distribution.base_path}</Card.Description>
		</Card.Header>
	</Card.Root>
</a>
