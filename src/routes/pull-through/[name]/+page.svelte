<script lang="ts">
	import { page } from '$app/stores';
	import { Badge } from '$lib/components/ui/badge';
	import CliHint from '$lib/components/CliHint.svelte';
	import CopyBlock from '$lib/components/CopyBlock.svelte';
	import Loader from '@lucide/svelte/icons/loader';
	import { auth } from '$lib/auth.svelte';
	import {
		getStatus,
		getContainerPullThroughDistributions,
		getPythonDistributions,
		getNpmDistributions,
		getRemote
	} from '$lib/pulp';

	interface PullThroughDetail {
		name: string;
		basePath: string;
		upstreamUrl: string;
		type: 'Container' | 'PyPI' | 'npm';
	}

	let entry = $state<PullThroughDetail | null>(null);
	let loading = $state(true);
	let error = $state('');
	let notFound = $state(false);

	const pulpUrl = $derived(auth.pulpUrl);
	const pulpHost = $derived(new URL(auth.pulpUrl).host);
	const upstreamHost = $derived(
		entry ? entry.upstreamUrl.replace('https://', '').replace('http://', '').replace(/\/$/, '') : ''
	);

	$effect(() => {
		const name = decodeURIComponent($page.params.name!);
		loading = true;
		error = '';
		notFound = false;

		(async () => {
			try {
				const status = await getStatus();
				const plugins = status.versions.map((v) => v.component);
				let found: PullThroughDetail | null = null;

				// Search in container pull-through
				if (!found && plugins.includes('container')) {
					try {
						const data = await getContainerPullThroughDistributions();
						const dist = data.results.find((d) => d.name === name);
						if (dist) {
							const remote = await getRemote(dist.remote);
							found = {
								name: dist.name,
								basePath: dist.base_path,
								upstreamUrl: remote.url,
								type: 'Container'
							};
						}
					} catch {
						// endpoint unavailable
					}
				}

				// Search in python distributions
				if (!found && plugins.includes('python')) {
					try {
						const data = await getPythonDistributions();
						const dist = data.results.find((d) => d.name === name && d.remote);
						if (dist) {
							const remote = await getRemote(dist.remote!);
							found = {
								name: dist.name,
								basePath: dist.base_path,
								upstreamUrl: remote.url,
								type: 'PyPI'
							};
						}
					} catch {
						// endpoint unavailable
					}
				}

				// Search in npm distributions
				if (!found && plugins.includes('npm')) {
					try {
						const data = await getNpmDistributions();
						const dist = data.results.find((d) => d.name === name && d.remote);
						if (dist) {
							const remote = await getRemote(dist.remote!);
							found = {
								name: dist.name,
								basePath: dist.base_path,
								upstreamUrl: remote.url,
								type: 'npm'
							};
						}
					} catch {
						// endpoint unavailable
					}
				}

				if (found) {
					entry = found;
				} else {
					notFound = true;
				}
			} catch (e) {
				error = e instanceof Error ? e.message : 'Unknown error';
			} finally {
				loading = false;
			}
		})();
	});
</script>

<div class="mx-auto max-w-4xl p-6 space-y-6">
	{#if loading}
		<div class="flex justify-center py-16">
			<Loader class="size-8 animate-spin text-muted-foreground" />
		</div>
	{:else if notFound}
		<p class="text-destructive">Pull-through cache not found</p>
	{:else if error}
		<p class="text-destructive">{error}</p>
	{:else if entry}
		<div>
			<div class="flex items-center gap-3">
				<h1 class="text-2xl font-bold">{entry.name}</h1>
				<Badge variant="secondary">{entry.type}</Badge>
			</div>
			<p class="mt-1 text-sm text-muted-foreground">
				Upstream: <span class="font-mono">{entry.upstreamUrl}</span>
			</p>
		</div>

		<CliHint>
			{#if entry.type === 'Container'}
				<code class="bg-muted px-1.5 py-0.5 rounded"
					>GET /pulp/api/v3/distributions/container/pull-through/?name={entry.name}</code
				>
			{:else if entry.type === 'PyPI'}
				<code class="bg-muted px-1.5 py-0.5 rounded"
					>GET /pulp/api/v3/distributions/python/pypi/?name={entry.name}</code
				>
			{:else if entry.type === 'npm'}
				<code class="bg-muted px-1.5 py-0.5 rounded"
					>GET /pulp/api/v3/distributions/npm/npm/?name={entry.name}</code
				>
			{/if}
		</CliHint>

		{#if entry.type === 'Container'}
			<section class="space-y-4">
				<h2 class="text-lg font-semibold">Quick pull</h2>
				<CopyBlock
					label="Podman"
					code={`podman pull ${pulpHost}/${entry.basePath}/<image>:<tag>`}
				/>
				<CopyBlock
					label="Docker"
					code={`docker pull ${pulpHost}/${entry.basePath}/<image>:<tag>`}
				/>
			</section>

			<section class="space-y-4">
				<h2 class="text-lg font-semibold">Configuration as registry mirror</h2>

				<CopyBlock
					label="Docker — /etc/docker/daemon.json"
					code={`{
  "registry-mirrors": ["${pulpUrl}/${entry.basePath}"]
}`}
				/>

				<CopyBlock
					label="Podman — /etc/containers/registries.conf.d/${entry.name}.conf"
					code={`[[registry]]
prefix = "${upstreamHost}"
location = "${upstreamHost}"

  [[registry.mirror]]
  location = "${pulpHost}/${entry.basePath}"
  insecure = true`}
				/>
			</section>
		{:else if entry.type === 'PyPI'}
			{@const indexUrl = `${pulpUrl}/pypi/${entry.basePath}/simple/`}

			<section class="space-y-4">
				<h2 class="text-lg font-semibold">Quick install</h2>
				<CopyBlock label="pip" code={`pip install --index-url ${indexUrl} <package>`} />
				<CopyBlock label="uv" code={`uv add --index-url ${indexUrl} <package>`} />
			</section>

			<section class="space-y-4">
				<h2 class="text-lg font-semibold">Configuration</h2>

				<CopyBlock
					label="pyproject.toml — uv (default index)"
					code={`[[tool.uv.index]]
name = "${entry.name}"
url = "${indexUrl}"
default = true`}
				/>

				<CopyBlock
					label="uv.toml — global (~/.config/uv/uv.toml)"
					code={`[[index]]
url = "${indexUrl}"
default = true`}
				/>

				<CopyBlock
					label="pip.conf — global (~/.config/pip/pip.conf)"
					code={`[global]
index-url = ${indexUrl}`}
				/>
			</section>
		{:else if entry.type === 'npm'}
			{@const registryUrl = `${pulpUrl}/pulp/content/${entry.basePath}/`}

			<section class="space-y-4">
				<h2 class="text-lg font-semibold">Quick install</h2>
				<CopyBlock label="npm" code={`npm install --registry ${registryUrl} <package>`} />
				<CopyBlock label="pnpm" code={`pnpm add --registry ${registryUrl} <package>`} />
			</section>

			<section class="space-y-4">
				<h2 class="text-lg font-semibold">Configuration</h2>

				<CopyBlock label=".npmrc — project or global (~/.npmrc)" code={`registry=${registryUrl}`} />

				<CopyBlock
					label=".yarnrc.yml — Yarn Berry (v2+)"
					code={`npmRegistryServer: "${registryUrl}"

unsafeHttpWhitelist:
  - "${pulpHost}"`}
				/>
			</section>
		{/if}
	{/if}
</div>
