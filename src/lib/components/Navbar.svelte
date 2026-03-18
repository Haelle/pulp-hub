<script lang="ts">
	import { Button } from '$lib/components/ui/button';

	let { pulpUrl }: { pulpUrl: string } = $props();
</script>

<nav class="border-b border-border bg-card">
	<div class="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
		<a href="/status" class="text-xl font-bold text-primary">PulpHub</a>

		<div class="flex items-center gap-3">
			<span class="text-sm text-muted-foreground">{pulpUrl}</span>
			<form method="POST" action="/logout">
				<Button type="submit" variant="outline" size="sm">Logout</Button>
			</form>
		</div>
	</div>
</nav>
