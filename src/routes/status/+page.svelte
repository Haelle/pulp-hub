<script lang="ts">
	import CliHint from '$lib/components/CliHint.svelte';

	let { data } = $props();
</script>

<div class="mx-auto max-w-3xl p-6 space-y-4">
	<h1 class="text-2xl font-bold">Pulp Status</h1>
	<CliHint command="pulp status" />
	<pre class="overflow-auto rounded-lg border border-border bg-card p-4 text-sm font-mono">{JSON.stringify(data.status, null, 2)}</pre>
</div>
