<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';

	let {
		name,
		upstreamUrl,
		type
	}: {
		name: string;
		upstreamUrl: string;
		type: 'Container' | 'PyPI' | 'npm';
	} = $props();
</script>

<a href="/pull-through/{encodeURIComponent(name)}" class="block">
	<Card.Root class="transition-colors hover:border-ring">
		<Card.Header>
			<div class="flex items-center justify-between">
				<Card.Title class="text-base">{name}</Card.Title>
				<Badge variant="secondary">{type}</Badge>
			</div>
			<Card.Description>{upstreamUrl}</Card.Description>
		</Card.Header>
	</Card.Root>
</a>
