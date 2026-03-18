<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as Alert from '$lib/components/ui/alert';
	import Terminal from '@lucide/svelte/icons/terminal';

	let { command, description, children }: { command?: string; description?: string; children?: Snippet } = $props();
</script>

<Alert.Root class="font-mono text-xs">
	<Terminal class="size-4" />
	<Alert.Title class="text-xs font-semibold">pulp-cli</Alert.Title>
	<Alert.Description>
		{#if children}
			{@render children()}
		{:else}
			{#if command}
				<code class="bg-muted px-1.5 py-0.5 rounded">{command}</code>
			{/if}
			{#if description}
				<span class="text-muted-foreground">{description}</span>
			{/if}
		{/if}
	</Alert.Description>
</Alert.Root>
