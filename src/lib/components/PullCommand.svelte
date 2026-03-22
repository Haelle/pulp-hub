<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';
	import { auth } from '$lib/auth.svelte';

	let { basePath, tag = 'latest' }: { basePath: string; tag?: string } = $props();

	const pulpHost = $derived(new URL(auth.pulpUrl).host);
	const pullPath = $derived(`${pulpHost}/${basePath}:${tag}`);

	let copiedPodman = $state(false);
	let copiedDocker = $state(false);

	async function copyPodman() {
		await navigator.clipboard.writeText(`podman pull ${pullPath}`);
		copiedPodman = true;
		setTimeout(() => (copiedPodman = false), 2000);
	}

	async function copyDocker() {
		await navigator.clipboard.writeText(`docker pull ${pullPath}`);
		copiedDocker = true;
		setTimeout(() => (copiedDocker = false), 2000);
	}
</script>

<div class="space-y-2">
	<div class="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2">
		<code class="flex-1 text-sm font-mono truncate">podman pull {pullPath}</code>
		<Button variant="ghost" size="icon-sm" onclick={copyPodman} aria-label="Copy pull command">
			{#if copiedPodman}
				<Check class="size-4 text-green-500" />
			{:else}
				<Copy class="size-4" />
			{/if}
		</Button>
	</div>
	<div class="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2">
		<code class="flex-1 text-sm font-mono truncate">docker pull {pullPath}</code>
		<Button variant="ghost" size="icon-sm" onclick={copyDocker} aria-label="Copy pull command">
			{#if copiedDocker}
				<Check class="size-4 text-green-500" />
			{:else}
				<Copy class="size-4" />
			{/if}
		</Button>
	</div>
</div>
