<script lang="ts">
	import CliHint from '$lib/components/CliHint.svelte';
	import Loader from '@lucide/svelte/icons/loader';
	import { auth } from '$lib/auth.svelte';

	let status = $state<unknown>(null);
	let loading = $state(true);
	let error = $state('');

	$effect(() => {
		(async () => {
			try {
				const res = await fetch(`${auth.pulpUrl}/pulp/api/v3/status/`, {
					headers: { Authorization: auth.basicAuthHeader }
				});
				if (!res.ok) throw new Error(`Pulp API error: ${res.status}`);
				status = await res.json();
			} catch (e) {
				error = e instanceof Error ? e.message : 'Unknown error';
			} finally {
				loading = false;
			}
		})();
	});
</script>

<div class="mx-auto max-w-3xl p-6 space-y-4">
	<h1 class="text-2xl font-bold">Pulp Status</h1>
	<CliHint command="pulp status" />

	{#if loading}
		<div class="flex justify-center py-16">
			<Loader class="size-8 animate-spin text-muted-foreground" />
		</div>
	{:else if error}
		<p class="text-destructive">{error}</p>
	{:else}
		<pre
			class="overflow-auto rounded-lg border border-border bg-card p-4 text-sm font-mono">{JSON.stringify(
				status,
				null,
				2
			)}</pre>
	{/if}
</div>
