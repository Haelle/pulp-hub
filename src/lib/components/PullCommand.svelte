<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';

	let { registryPath, tag = 'latest' }: { registryPath: string; tag?: string } = $props();

	const command = $derived(`podman pull ${registryPath}:${tag}`);
	let copied = $state(false);

	async function copy() {
		await navigator.clipboard.writeText(command);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2">
	<code class="flex-1 text-sm font-mono truncate">{command}</code>
	<Button variant="ghost" size="icon-sm" onclick={copy} aria-label="Copy pull command">
		{#if copied}
			<Check class="size-4 text-green-500" />
		{:else}
			<Copy class="size-4" />
		{/if}
	</Button>
</div>
