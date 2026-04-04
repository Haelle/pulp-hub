<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Badge } from '$lib/components/ui/badge';
	import * as Popover from '$lib/components/ui/popover';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { auth } from '$lib/auth.svelte';
	import { APP_VERSION } from '$lib/version';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import CircleHelp from '@lucide/svelte/icons/circle-help';

	const repoItems = [
		{ label: 'Images', href: '/images' },
		{ label: 'Files', href: '/files' },
		{ label: 'npm', href: '/npm' },
		{ label: 'PyPI', href: '/python' }
	];

	const adminItems = [
		{ label: 'Status', href: '/status' },
		{ label: 'Tasks', href: '/tasks' },
		{ label: 'Users', href: '/users' }
	];

	function isActiveGroup(items: { href: string }[]): boolean {
		return items.some((item) => $page.url.pathname.startsWith(item.href));
	}

	function activeLabel(items: { label: string; href: string }[]): string | undefined {
		return items.find((item) => $page.url.pathname.startsWith(item.href))?.label;
	}
</script>

<nav class="border-b border-border bg-card">
	<div class="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
		<div class="flex items-center gap-6">
			<a href="/images" class="text-xl font-bold">PulpHub</a><span
				class="text-xs text-muted-foreground">{APP_VERSION}</span
			>
			<div class="flex items-center gap-1">
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant={isActiveGroup(repoItems) ? 'secondary' : 'ghost'}
								size="sm"
							>
								{activeLabel(repoItems) ?? 'Repositories'}
								<ChevronDown class="ml-1 size-3" />
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						{#each repoItems as item (item.href)}
							<DropdownMenu.Item onclick={() => goto(item.href)}>
								{item.label}
							</DropdownMenu.Item>
						{/each}
					</DropdownMenu.Content>
				</DropdownMenu.Root>

				<Button
					variant={$page.url.pathname.startsWith('/pull-through') ? 'secondary' : 'ghost'}
					size="sm"
					href="/pull-through">Pull-through</Button
				>

				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant={isActiveGroup(adminItems) ? 'secondary' : 'ghost'}
								size="sm"
							>
								{activeLabel(adminItems) ?? 'Admin'}
								<ChevronDown class="ml-1 size-3" />
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						{#each adminItems as item (item.href)}
							<DropdownMenu.Item onclick={() => goto(item.href)}>
								{item.label}
							</DropdownMenu.Item>
						{/each}
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
		</div>

		<div class="flex items-center gap-3">
			<span class="text-sm text-muted-foreground">{auth.pulpUrl}</span>
			<Badge variant="outline" data-testid="auth-badge" class="gap-1">
				{auth.username} · Basic Auth
				<Popover.Root>
					<Popover.Trigger data-testid="auth-help" class="inline-flex cursor-pointer">
						<CircleHelp class="h-3.5 w-3.5 text-muted-foreground" />
					</Popover.Trigger>
					<Popover.Portal>
						<Popover.Content data-testid="auth-popover" class="w-80 text-sm">
							<p class="font-semibold mb-1">Basic Auth</p>
							<p class="text-muted-foreground mb-2">
								Les credentials sont envoyés encodés en base64 à chaque requête.
								Ce mode est moins sécurisé qu'un token d'authentification.
							</p>
							<p class="text-muted-foreground">
								Recommandation : activez <code class="text-xs bg-muted px-1 py-0.5 rounded">AUTH_TOKEN</code>
								sur votre serveur Pulp pour une meilleure sécurité.
							</p>
						</Popover.Content>
					</Popover.Portal>
				</Popover.Root>
			</Badge>
			<ThemeToggle />
			<Button variant="outline" size="sm" onclick={() => auth.logout()}>Logout</Button>
		</div>
	</div>
</nav>
