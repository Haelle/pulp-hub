<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();
</script>

<div class="flex min-h-screen items-center justify-center">
	<div class="w-full max-w-sm space-y-6">
		<div class="text-center">
			<h1 class="text-4xl font-bold text-primary">PulpHub</h1>
			<p class="mt-2 text-muted-foreground">Connect to your Pulp instance</p>
		</div>

		<form method="POST" use:enhance class="space-y-4">
			<div class="space-y-2">
				<label for="url" class="text-sm font-medium">Pulp URL</label>
				<input
					id="url"
					name="url"
					type="url"
					placeholder="https://pulp.local:8443"
					required
					class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
				/>
			</div>

			<div class="space-y-2">
				<label for="username" class="text-sm font-medium">Username</label>
				<input
					id="username"
					name="username"
					type="text"
					required
					class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
				/>
			</div>

			<div class="space-y-2">
				<label for="password" class="text-sm font-medium">Password</label>
				<input
					id="password"
					name="password"
					type="password"
					required
					class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
				/>
			</div>

			{#if form?.error}
				<p class="text-sm text-destructive">{form.error}</p>
			{/if}

			<button
				type="submit"
				class="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring"
			>
				Connect
			</button>
		</form>
	</div>
</div>
