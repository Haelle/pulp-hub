<script lang="ts">
	import { page } from "$app/stores";
	import { Button } from "$lib/components/ui/button";
	import ThemeToggle from "$lib/components/ThemeToggle.svelte";
	import { auth } from "$lib/auth.svelte";
</script>

<nav class="border-b border-border bg-card">
	<div
		class="mx-auto flex h-14 max-w-6xl items-center justify-between px-4"
	>
		<div class="flex items-center gap-6">
			<a href="/repositories" class="text-xl font-bold"
				>PulpHub</a
			>
			<div class="flex items-center gap-1">
				<Button
					variant={$page.url.pathname ===
					"/status"
						? "secondary"
						: "ghost"}
					size="sm"
					href="/status">Status</Button
				>
				<Button
					variant={$page.url.pathname.startsWith(
						"/repositories",
					)
						? "secondary"
						: "ghost"}
					size="sm"
					href="/repositories"
					>Repositories</Button
				>
				<Button
					variant={$page.url.pathname.startsWith(
						"/files",
					)
						? "secondary"
						: "ghost"}
					size="sm"
					href="/files"
					>Files</Button
				>
				<Button
					variant={$page.url.pathname.startsWith(
						"/pull-through",
					)
						? "secondary"
						: "ghost"}
					size="sm"
					href="/pull-through"
					>Pull-through</Button
				>
			</div>
		</div>

		<div class="flex items-center gap-3">
			<span class="text-sm text-muted-foreground"
				>{auth.pulpUrl}</span
			>
			<ThemeToggle />
			<Button
				variant="outline"
				size="sm"
				onclick={() => auth.logout()}>Logout</Button
			>
		</div>
	</div>
</nav>
