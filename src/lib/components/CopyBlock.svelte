<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';

	let { code, label = '' }: { code: string; label?: string } = $props();

	let copied = $state(false);

	async function copy() {
		await navigator.clipboard.writeText(code);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

{#if label}
	<p class="text-sm font-medium text-muted-foreground mb-1">{label}</p>
{/if}
<div class="flex items-start gap-2 rounded-md border border-border bg-muted px-3 py-2">
	<pre class="flex-1 text-sm font-mono whitespace-pre-wrap break-all overflow-x-auto">{code}</pre>
	<Button variant="ghost" size="icon-sm" onclick={copy} aria-label="Copy">
		{#if copied}
			<Check class="size-4 text-green-500" />
		{:else}
			<Copy class="size-4" />
		{/if}
	</Button>
</div>
