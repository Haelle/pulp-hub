<script lang="ts">
	import { enhance } from "$app/forms";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import * as Card from "$lib/components/ui/card";
	import * as Alert from "$lib/components/ui/alert";
	import CircleAlert from "@lucide/svelte/icons/circle-alert";
	import ThemeToggle from "$lib/components/ThemeToggle.svelte";
	import CliHint from "$lib/components/CliHint.svelte";

	let { form } = $props();
</script>

<div class="flex min-h-screen items-center justify-center px-4 relative">
	<div class="absolute top-4 right-4">
		<ThemeToggle />
	</div>
	<Card.Root class="w-full max-w-md">
		<Card.Header class="text-center">
			<Card.Title class="text-3xl font-bold text-primary"
				>PulpHub</Card.Title
			>
			<Card.Description
				>Connect to your Pulp instance</Card.Description
			>
		</Card.Header>
		<Card.Content>
			<form method="POST" use:enhance class="space-y-4">
				<div class="space-y-2">
					<Label for="url">Pulp URL</Label>
					<Input
						id="url"
						name="url"
						type="url"
						placeholder="https://pulp.local:8443"
						required
					/>
				</div>

				<div class="space-y-2">
					<Label for="username">Username</Label>
					<Input
						id="username"
						name="username"
						type="text"
						required
					/>
				</div>

				<div class="space-y-2">
					<Label for="password">Password</Label>
					<Input
						id="password"
						name="password"
						type="password"
						required
					/>
				</div>

				{#if form?.error}
					<Alert.Root variant="destructive">
						<CircleAlert class="size-4" />
						<Alert.Title>Error</Alert.Title>
						<Alert.Description
							>{form.error}</Alert.Description
						>
					</Alert.Root>
				{/if}

				<Button type="submit" class="w-full"
					>Connect</Button
				>
			</form>
			<div class="pt-4">
				<CliHint>
					<code
						class="bg-muted px-1.5 py-0.5 rounded"
						>pulp config create</code
					>
					<span class="text-muted-foreground">
						(interactive)</span
					>
					<span class="text-muted-foreground">
						or with explicit params</span
					>
					<pre
						class="bg-muted px-1.5 py-0.5 rounded">pulp config create \
  --base-url https://pulp.url:port \
  --username admin \
  --password admin \
  --no-verify-ssl</pre>
				</CliHint>
			</div>
		</Card.Content>
	</Card.Root>
</div>
