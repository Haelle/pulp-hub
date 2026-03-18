<script lang="ts">
	let { pulpUrl }: { pulpUrl: string } = $props();
</script>

<nav class="border-b border-border bg-card">
	<div class="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
		<a href="/status" class="text-xl font-bold text-primary">PulpHub</a>

		<div class="flex items-center gap-4">
			<span class="text-sm text-muted-foreground">{pulpUrl}</span>
			<form method="POST" action="/logout">
				<button
					type="submit"
					class="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
				>
					Logout
				</button>
			</form>
		</div>
	</div>
</nav>
