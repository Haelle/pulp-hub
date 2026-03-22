<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import CliHint from '$lib/components/CliHint.svelte';
	import Loader from '@lucide/svelte/icons/loader';
	import UserRound from '@lucide/svelte/icons/user-round';
	import { getUsers, type PulpPaginated, type PulpUser } from '$lib/pulp';

	const limit = 20;
	let offset = $state(0);
	let filter = $state('');
	let data = $state<PulpPaginated<PulpUser> | null>(null);
	let loading = $state(true);
	let error = $state('');

	async function load() {
		loading = true;
		error = '';
		try {
			data = await getUsers(limit, offset);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unknown error';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		void offset;
		load();
	});

	const filtered = $derived(
		data?.results.filter(
			(u) =>
				u.username.toLowerCase().includes(filter.toLowerCase()) ||
				u.email.toLowerCase().includes(filter.toLowerCase())
		) ?? []
	);

	const hasPrev = $derived(offset > 0);
	const hasNext = $derived(data?.next !== null);

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<div class="mx-auto max-w-6xl p-6 space-y-6">
	<h1 class="text-2xl font-bold">Users</h1>
	<CliHint command="pulp user list" />

	{#if loading}
		<div class="flex justify-center py-16">
			<Loader class="size-8 animate-spin text-muted-foreground" />
		</div>
	{:else if error}
		<p class="text-destructive">{error}</p>
	{:else}
		<Input placeholder="Filter users..." bind:value={filter} class="max-w-sm" />

		{#if filtered.length > 0}
			<div class="rounded-md border">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b bg-muted/50">
							<th class="px-4 py-2 text-left font-medium">Username</th>
							<th class="px-4 py-2 text-left font-medium">Email</th>
							<th class="px-4 py-2 text-left font-medium">Role</th>
							<th class="px-4 py-2 text-left font-medium">Status</th>
							<th class="px-4 py-2 text-left font-medium">Joined</th>
						</tr>
					</thead>
					<tbody>
						{#each filtered as user (user.pulp_href)}
							<tr class="border-b last:border-0">
								<td class="px-4 py-2 font-mono">{user.username}</td>
								<td class="px-4 py-2 text-muted-foreground">{user.email || '—'}</td>
								<td class="px-4 py-2">
									{#if user.is_staff}
										<Badge variant="default">Staff</Badge>
									{/if}
								</td>
								<td class="px-4 py-2">
									{#if user.is_active}
										<Badge variant="secondary">Active</Badge>
									{:else}
										<Badge variant="outline">Inactive</Badge>
									{/if}
								</td>
								<td class="px-4 py-2 text-muted-foreground">{formatDate(user.date_joined)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<div class="flex flex-col items-center justify-center py-16 text-muted-foreground">
				<UserRound class="size-12 mb-4" />
				<p>No users found</p>
			</div>
		{/if}

		{#if data && data.count > limit}
			<div class="flex items-center justify-center gap-2">
				<Button
					variant="outline"
					size="sm"
					disabled={!hasPrev}
					onclick={() => (offset = Math.max(0, offset - limit))}
				>
					Previous
				</Button>
				<span class="text-sm text-muted-foreground">
					{offset + 1}–{Math.min(offset + limit, data.count)} of {data.count}
				</span>
				<Button variant="outline" size="sm" disabled={!hasNext} onclick={() => (offset += limit)}>
					Next
				</Button>
			</div>
		{/if}
	{/if}
</div>
