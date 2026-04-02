<script lang="ts">
	import { page } from '$app/stores';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import CliHint from '$lib/components/CliHint.svelte';
	import Loader from '@lucide/svelte/icons/loader';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { getTask, type PulpTask, type TaskState } from '$lib/pulp';
	import { hrefToId, formatDuration } from '$lib/utils';

	let task = $state<PulpTask | null>(null);
	let loading = $state(true);
	let error = $state('');
	let notFound = $state(false);
	let tracebackOpen = $state(false);

	type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

	function stateBadgeVariant(s: TaskState): BadgeVariant {
		switch (s) {
			case 'completed':
				return 'secondary';
			case 'running':
				return 'default';
			case 'failed':
				return 'destructive';
			default:
				return 'outline';
		}
	}

	function stateBadgeClass(s: TaskState): string {
		if (s === 'completed') return 'bg-green-600 text-white border-transparent';
		return '';
	}

	function formatDate(iso: string | null): string {
		if (!iso) return '—';
		return new Date(iso).toLocaleString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	function resourceToLink(href: string): { url: string; label: string } | null {
		if (href.includes('/distributions/container/container/')) {
			return { url: `/images/${hrefToId(href)}`, label: 'Container distribution' };
		}
		if (href.includes('/distributions/file/file/')) {
			return { url: `/files/${hrefToId(href)}`, label: 'File distribution' };
		}
		if (href.includes('/distributions/npm/npm/')) {
			return { url: `/npm`, label: 'npm distribution' };
		}
		if (href.includes('/distributions/python/pypi/')) {
			return { url: `/python`, label: 'Python distribution' };
		}
		return null;
	}

	$effect(() => {
		const id = $page.params.id;
		const href = `/pulp/api/v3/tasks/${id}/`;
		loading = true;
		error = '';
		notFound = false;
		tracebackOpen = false;

		(async () => {
			try {
				task = await getTask(href);
			} catch (e) {
				if (e instanceof Error && e.message.includes('404')) {
					notFound = true;
				} else {
					error = e instanceof Error ? e.message : 'Unknown error';
				}
			} finally {
				loading = false;
			}
		})();
	});
</script>

<div class="mx-auto max-w-6xl p-6 space-y-6">
	{#if loading}
		<div class="flex justify-center py-16">
			<Loader class="size-8 animate-spin text-muted-foreground" />
		</div>
	{:else if notFound}
		<p class="text-destructive">Task not found</p>
	{:else if error}
		<p class="text-destructive">{error}</p>
	{:else if task}
		<!-- Header -->
		<div class="space-y-2">
			<div class="flex items-center gap-3 flex-wrap">
				<h1 class="text-2xl font-bold font-mono break-all">{task.name}</h1>
				<Badge variant={stateBadgeVariant(task.state)} class={stateBadgeClass(task.state)}>
					{task.state}
				</Badge>
			</div>
			<a href="/tasks" class="text-sm text-muted-foreground hover:underline">&larr; Back to tasks</a
			>
		</div>

		<CliHint command="pulp task show --href {task.pulp_href}" />

		<!-- Timing -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Timing</Card.Title>
			</Card.Header>
			<Card.Content>
				<dl class="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
					<div>
						<dt class="text-muted-foreground">Created</dt>
						<dd>{formatDate(task.pulp_created)}</dd>
					</div>
					<div>
						<dt class="text-muted-foreground">Started</dt>
						<dd>{formatDate(task.started_at)}</dd>
					</div>
					<div>
						<dt class="text-muted-foreground">Finished</dt>
						<dd>{formatDate(task.finished_at)}</dd>
					</div>
					<div>
						<dt class="text-muted-foreground">Duration</dt>
						<dd>{formatDuration(task.started_at, task.finished_at)}</dd>
					</div>
				</dl>
				{#if task.worker}
					<div class="mt-3 text-sm">
						<span class="text-muted-foreground">Worker:</span>
						<span class="font-mono">{task.worker}</span>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Error -->
		{#if task.error}
			<Alert.Root variant="destructive">
				<Alert.Title>Error</Alert.Title>
				<Alert.Description>
					<p class="mb-2">{task.error.description}</p>
					{#if task.error.traceback}
						<Button variant="outline" size="sm" onclick={() => (tracebackOpen = !tracebackOpen)}>
							{#if tracebackOpen}
								<ChevronDown class="size-3 mr-1" />
							{:else}
								<ChevronRight class="size-3 mr-1" />
							{/if}
							Traceback
						</Button>
						{#if tracebackOpen}
							<pre class="mt-2 overflow-x-auto rounded bg-destructive/10 p-3 text-xs">{task.error
									.traceback}</pre>
						{/if}
					{/if}
				</Alert.Description>
			</Alert.Root>
		{/if}

		<!-- Progress Reports -->
		{#if task.progress_reports.length > 0}
			<Card.Root>
				<Card.Header>
					<Card.Title>Progress Reports</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="rounded-md border">
						<table class="w-full text-sm">
							<thead>
								<tr class="border-b bg-muted/50">
									<th class="px-4 py-2 text-left font-medium">Message</th>
									<th class="px-4 py-2 text-left font-medium">State</th>
									<th class="px-4 py-2 text-left font-medium">Progress</th>
								</tr>
							</thead>
							<tbody>
								{#each task.progress_reports as report (report.code)}
									<tr class="border-b last:border-0">
										<td class="px-4 py-2">{report.message}</td>
										<td class="px-4 py-2">
											<Badge variant="outline">{report.state}</Badge>
										</td>
										<td class="px-4 py-2 font-mono text-xs">
											{#if report.total !== null}
												{report.done ?? 0} / {report.total}{report.suffix
													? ` ${report.suffix}`
													: ''}
											{:else}
												—
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Created Resources -->
		{#if task.created_resources.length > 0}
			<Card.Root>
				<Card.Header>
					<Card.Title>Created Resources</Card.Title>
				</Card.Header>
				<Card.Content>
					<ul class="space-y-1 text-sm">
						{#each task.created_resources as href (href)}
							{@const link = resourceToLink(href)}
							<li class="font-mono text-xs break-all">
								{#if link}
									<a href={link.url} class="hover:underline text-foreground">
										{link.label}
									</a>
									<span class="text-muted-foreground ml-1">({href})</span>
								{:else}
									<span class="text-muted-foreground">{href}</span>
								{/if}
							</li>
						{/each}
					</ul>
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Reserved Resources -->
		{#if task.reserved_resources_record.length > 0}
			<Card.Root>
				<Card.Header>
					<Card.Title>Reserved Resources</Card.Title>
				</Card.Header>
				<Card.Content>
					<ul class="space-y-1">
						{#each task.reserved_resources_record as href (href)}
							<li class="font-mono text-xs text-muted-foreground break-all">{href}</li>
						{/each}
					</ul>
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Parent / Child Tasks -->
		{#if task.parent_task || task.child_tasks.length > 0}
			<Card.Root>
				<Card.Header>
					<Card.Title>Related Tasks</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-2 text-sm">
					{#if task.parent_task}
						<div>
							<span class="text-muted-foreground">Parent:</span>
							<a
								href="/tasks/{hrefToId(task.parent_task)}"
								class="font-mono text-xs hover:underline ml-1"
							>
								{hrefToId(task.parent_task)}
							</a>
						</div>
					{/if}
					{#if task.child_tasks.length > 0}
						<div>
							<span class="text-muted-foreground">Children:</span>
							<ul class="mt-1 space-y-1">
								{#each task.child_tasks as child (child)}
									<li>
										<a href="/tasks/{hrefToId(child)}" class="font-mono text-xs hover:underline">
											{hrefToId(child)}
										</a>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		{/if}
	{/if}
</div>
