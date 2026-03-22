<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { auth } from '$lib/auth.svelte';
	import { APP_VERSION } from '$lib/version';
</script>

<nav class="border-b border-border bg-card">
	<div class="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
		<div class="flex items-center gap-6">
			<a href="/images" class="text-xl font-bold">PulpHub</a><span
				class="text-xs text-muted-foreground">{APP_VERSION}</span
			>
			<div class="flex items-center gap-1">
				<Button
					variant={$page.url.pathname === '/status' ? 'secondary' : 'ghost'}
					size="sm"
					href="/status">Status</Button
				>
				<Button
					variant={$page.url.pathname.startsWith('/images') ? 'secondary' : 'ghost'}
					size="sm"
					href="/images">Images</Button
				>
				<Button
					variant={$page.url.pathname.startsWith('/files') ? 'secondary' : 'ghost'}
					size="sm"
					href="/files">Files</Button
				>
				<Button
					variant={$page.url.pathname.startsWith('/npm') ? 'secondary' : 'ghost'}
					size="sm"
					href="/npm">npm</Button
				>
				<Button
					variant={$page.url.pathname.startsWith('/pull-through') ? 'secondary' : 'ghost'}
					size="sm"
					href="/pull-through">Pull-through</Button
				>
				<Button
					variant={$page.url.pathname.startsWith('/users') ? 'secondary' : 'ghost'}
					size="sm"
					href="/users">Users</Button
				>
			</div>
		</div>

		<div class="flex items-center gap-3">
			<span class="text-sm text-muted-foreground">{auth.pulpUrl}</span>
			<ThemeToggle />
			<Button variant="outline" size="sm" onclick={() => auth.logout()}>Logout</Button>
		</div>
	</div>
</nav>
