<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import CliHint from '$lib/components/CliHint.svelte';
	import Loader from '@lucide/svelte/icons/loader';
	import ListTodo from '@lucide/svelte/icons/list-todo';
	import Cpu from '@lucide/svelte/icons/cpu';
	import {
		getTasks,
		getWorkers,
		type PulpPaginated,
		type PulpTask,
		type PulpWorker,
		type TaskState
	} from '$lib/pulp';
	import { hrefToId, formatDuration } from '$lib/utils';

	type Tab = 'tasks' | 'workers';
	let activeTab = $state<Tab>('tasks');

	// ── Tasks state ──────────────────────────────────────────
	const limit = 20;
	let offset = $state(0);
	let stateFilter = $state<TaskState | undefined>(undefined);
	let nameFilter = $state('');
	let debouncedName = $state('');
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;
	let taskData = $state<PulpPaginated<PulpTask> | null>(null);
	let tasksLoading = $state(true);
	let tasksError = $state('');

	// ── Workers state ────────────────────────────────────────
	let workers = $state<PulpWorker[]>([]);
	let workersLoading = $state(false);
	let workersError = $state('');

	const states: (TaskState | undefined)[] = [
		undefined,
		'running',
		'waiting',
		'completed',
		'failed',
		'canceled'
	];

	function stateLabel(s: TaskState | undefined): string {
		return s ?? 'All';
	}

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

	function shortTaskName(name: string): string {
		// e.g. "pulpcore.app.tasks.repository.delete" → "repository.delete"
		const parts = name.split('.');
		return parts.length > 2 ? parts.slice(-2).join('.') : name;
	}

	function shortWorkerName(name: string | null): string {
		if (!name) return '—';
		// e.g. "/pulp/api/v3/workers/abc/" → last segment, or just extract meaningful part
		// Worker names are like "resource-manager" or "reserved-resource-worker-1"
		return name.replace(/.*\//, '').replace(/\/$/, '') || name;
	}

	function formatDate(iso: string | null): string {
		if (!iso) return '—';
		return new Date(iso).toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	function isWorkerOnline(lastHeartbeat: string): boolean {
		return Date.now() - new Date(lastHeartbeat).getTime() < 60_000;
	}

	// Debounce name filter
	$effect(() => {
		void nameFilter;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			debouncedName = nameFilter;
			offset = 0;
		}, 300);
		return () => clearTimeout(debounceTimer);
	});

	// Load tasks
	async function loadTasks() {
		tasksLoading = true;
		tasksError = '';
		try {
			taskData = await getTasks(limit, offset, stateFilter, debouncedName || undefined);
		} catch (e) {
			tasksError = e instanceof Error ? e.message : 'Unknown error';
		} finally {
			tasksLoading = false;
		}
	}

	$effect(() => {
		if (activeTab === 'tasks') {
			void offset;
			void stateFilter;
			void debouncedName;
			loadTasks();
		}
	});

	// Load workers
	async function loadWorkers() {
		workersLoading = true;
		workersError = '';
		try {
			const data = await getWorkers();
			workers = data.results;
		} catch (e) {
			workersError = e instanceof Error ? e.message : 'Unknown error';
		} finally {
			workersLoading = false;
		}
	}

	$effect(() => {
		if (activeTab === 'workers') {
			loadWorkers();
		}
	});

	const hasPrev = $derived(offset > 0);
	const hasNext = $derived(taskData?.next !== null);
</script>

<div class="mx-auto max-w-6xl p-6 space-y-6">
	<h1 class="text-2xl font-bold">Tasks & Workers</h1>

	<!-- Tabs -->
	<div class="flex gap-1">
		<Button
			variant={activeTab === 'tasks' ? 'secondary' : 'ghost'}
			size="sm"
			onclick={() => (activeTab = 'tasks')}
		>
			Tasks
		</Button>
		<Button
			variant={activeTab === 'workers' ? 'secondary' : 'ghost'}
			size="sm"
			onclick={() => (activeTab = 'workers')}
		>
			Workers
		</Button>
	</div>

	{#if activeTab === 'tasks'}
		<CliHint command="pulp task list" />

		<!-- State filter buttons -->
		<div class="flex flex-wrap gap-1">
			{#each states as s (s ?? 'all')}
				<Button
					variant={stateFilter === s ? 'secondary' : 'ghost'}
					size="sm"
					onclick={() => {
						stateFilter = s;
						offset = 0;
					}}
				>
					{stateLabel(s)}
				</Button>
			{/each}
		</div>

		<Input placeholder="Filter by task name..." bind:value={nameFilter} class="max-w-sm" />

		{#if tasksLoading}
			<div class="flex justify-center py-16">
				<Loader class="size-8 animate-spin text-muted-foreground" />
			</div>
		{:else if tasksError}
			<p class="text-destructive">{tasksError}</p>
		{:else if taskData && taskData.results.length > 0}
			<div class="rounded-md border">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b bg-muted/50">
							<th class="px-4 py-2 text-left font-medium">Name</th>
							<th class="px-4 py-2 text-left font-medium">State</th>
							<th class="px-4 py-2 text-left font-medium">Worker</th>
							<th class="px-4 py-2 text-left font-medium">Started</th>
							<th class="px-4 py-2 text-left font-medium">Duration</th>
						</tr>
					</thead>
					<tbody>
						{#each taskData.results as task (task.pulp_href)}
							<tr class="border-b last:border-0 hover:bg-muted/30">
								<td class="px-4 py-2">
									<a
										href="/tasks/{hrefToId(task.pulp_href)}"
										class="font-mono text-xs hover:underline"
										title={task.name}
									>
										{shortTaskName(task.name)}
									</a>
								</td>
								<td class="px-4 py-2">
									<Badge
										variant={stateBadgeVariant(task.state)}
										class={stateBadgeClass(task.state)}
									>
										{task.state}
									</Badge>
								</td>
								<td class="px-4 py-2 text-muted-foreground text-xs">
									{shortWorkerName(task.worker)}
								</td>
								<td class="px-4 py-2 text-muted-foreground text-xs">
									{formatDate(task.started_at)}
								</td>
								<td class="px-4 py-2 text-muted-foreground text-xs">
									{formatDuration(task.started_at, task.finished_at)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			{#if taskData.count > limit}
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
						{offset + 1}–{Math.min(offset + limit, taskData.count)} of {taskData.count}
					</span>
					<Button variant="outline" size="sm" disabled={!hasNext} onclick={() => (offset += limit)}>
						Next
					</Button>
				</div>
			{/if}
		{:else}
			<div class="flex flex-col items-center justify-center py-16 text-muted-foreground">
				<ListTodo class="size-12 mb-4" />
				<p>No tasks found</p>
			</div>
		{/if}
	{:else}
		<!-- Workers tab -->
		<CliHint command="pulp worker list" />

		{#if workersLoading}
			<div class="flex justify-center py-16">
				<Loader class="size-8 animate-spin text-muted-foreground" />
			</div>
		{:else if workersError}
			<p class="text-destructive">{workersError}</p>
		{:else if workers.length > 0}
			<div class="rounded-md border">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b bg-muted/50">
							<th class="px-4 py-2 text-left font-medium">Name</th>
							<th class="px-4 py-2 text-left font-medium">Status</th>
							<th class="px-4 py-2 text-left font-medium">Last Heartbeat</th>
							<th class="px-4 py-2 text-left font-medium">Current Task</th>
						</tr>
					</thead>
					<tbody>
						{#each workers as worker (worker.pulp_href)}
							<tr class="border-b last:border-0">
								<td class="px-4 py-2 font-mono text-xs">{worker.name}</td>
								<td class="px-4 py-2">
									{#if isWorkerOnline(worker.last_heartbeat)}
										<Badge variant="secondary" class="bg-green-600 text-white border-transparent"
											>Online</Badge
										>
									{:else}
										<Badge variant="destructive">Offline</Badge>
									{/if}
								</td>
								<td class="px-4 py-2 text-muted-foreground text-xs">
									{formatDate(worker.last_heartbeat)}
								</td>
								<td class="px-4 py-2">
									{#if worker.current_task}
										<a
											href="/tasks/{hrefToId(worker.current_task)}"
											class="font-mono text-xs hover:underline"
										>
											{hrefToId(worker.current_task)}
										</a>
									{:else}
										<span class="text-muted-foreground">—</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<div class="flex flex-col items-center justify-center py-16 text-muted-foreground">
				<Cpu class="size-12 mb-4" />
				<p>No workers found</p>
			</div>
		{/if}
	{/if}
</div>
