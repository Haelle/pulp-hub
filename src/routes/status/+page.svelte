<script lang="ts">
	let { data } = $props();
</script>

<div class="min-h-screen p-8">
	<div class="mx-auto max-w-3xl space-y-4">
		<div>
			<h1 class="text-3xl font-bold text-primary">Pulp Status</h1>
			<p class="mt-1 text-sm text-muted-foreground">{data.url}</p>
		</div>

		<pre class="overflow-auto rounded-lg border border-border bg-card p-4 text-sm font-mono">{JSON.stringify(data.status, null, 2)}</pre>
	</div>
</div>
