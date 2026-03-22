import { test, expect, type Page } from '@playwright/test';

const PULP_URL = process.env.PULP_URL ?? `http://localhost:${process.env.TALKBACK_PORT ?? '8787'}`;
const PULP_USER = process.env.PULP_USER ?? 'admin';
const PULP_PASS = process.env.PULP_PASS ?? 'admin';

async function login(page: Page) {
	await page.goto('/');
	await page.fill('input[name="url"]', PULP_URL);
	await page.fill('input[name="username"]', PULP_USER);
	await page.fill('input[name="password"]', PULP_PASS);
	await page.click('button[type="submit"]');
	await expect(page).toHaveURL('/images');
}

test.describe('Pull-through list page', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('navbar has Pull-through link', async ({ page }) => {
		const link = page.getByRole('link', { name: 'Pull-through' });
		await expect(link).toBeVisible();
	});

	test('navigate to /pull-through via navbar', async ({ page }) => {
		await page.getByRole('link', { name: 'Pull-through' }).click();
		await expect(page).toHaveURL('/pull-through');
	});

	test('displays page title', async ({ page }) => {
		await page.goto('/pull-through');
		await expect(page.locator('h1')).toContainText('Pull-through');
	});

	test('shows cli hint', async ({ page }) => {
		await page.goto('/pull-through');
		await expect(page.locator('[data-slot="alert-title"]')).toContainText('pulp-cli');
	});

	test('displays pull-through cards with name and upstream URL', async ({ page }) => {
		await page.goto('/pull-through');

		const cards = page.locator('[data-slot="card"]');
		await expect(cards.first()).toBeVisible();

		await expect(cards.first().locator('[data-slot="card-title"]')).toBeVisible();
		await expect(cards.first().locator('[data-slot="card-description"]')).toBeVisible();
	});

	test('cards show the type badge', async ({ page }) => {
		await page.goto('/pull-through');

		const badge = page.locator('[data-slot="card"]').first().locator('[data-slot="badge"]');
		await expect(badge).toBeVisible();
	});

	test('card links to detail page', async ({ page }) => {
		await page.goto('/pull-through');

		await page.locator('[data-slot="card"]').first().click();
		await expect(page).toHaveURL(/\/pull-through\//);
	});

	test('filter narrows results', async ({ page }) => {
		await page.goto('/pull-through');

		const allCards = await page.locator('[data-slot="card"]').count();
		if (allCards > 1) {
			const filterInput = page.getByPlaceholder(/search|filter/i);
			const firstName = await page.locator('[data-slot="card-title"]').first().textContent();
			await filterInput.fill(firstName!.trim());

			const filteredCards = await page.locator('[data-slot="card"]').count();
			expect(filteredCards).toBeLessThan(allCards);
		}
	});

	test('filter with no match shows empty state', async ({ page }) => {
		await page.goto('/pull-through');

		const filterInput = page.getByPlaceholder(/search|filter/i);
		await filterInput.fill('zzz-nonexistent-zzz');

		await expect(page.getByText(/no|aucun|empty/i)).toBeVisible();
	});
});

test.describe('Pull-through detail page', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('navigable from list page', async ({ page }) => {
		await page.goto('/pull-through');
		await page.locator('[data-slot="card"]').first().click();
		await expect(page).toHaveURL(/\/pull-through\//);
		await expect(page.locator('h1')).toBeVisible();
	});

	test('displays name and type badge', async ({ page }) => {
		await page.goto('/pull-through');
		await page.locator('[data-slot="card"]').first().click();
		await expect(page).toHaveURL(/\/pull-through\//);

		await expect(page.locator('h1')).toBeVisible();
		await expect(page.locator('h1 + [data-slot="badge"]')).toBeVisible();
	});

	test('shows upstream URL', async ({ page }) => {
		await page.goto('/pull-through');
		await page.locator('[data-slot="card"]').first().click();
		await expect(page).toHaveURL(/\/pull-through\//);

		// Upstream URL should be visible somewhere on the page
		await expect(page.getByText(/https?:\/\//).first()).toBeVisible();
	});

	test('shows copyable usage command', async ({ page }) => {
		await page.goto('/pull-through');
		await page.locator('[data-slot="card"]').first().click();

		// Should have a copy button
		const copyButton = page.getByRole('button', { name: /copy/i });
		await expect(copyButton.first()).toBeVisible();
	});

	test('shows client configuration section', async ({ page }) => {
		await page.goto('/pull-through');
		await page.locator('[data-slot="card"]').first().click();

		// Should have a "Configuration" or config section with code blocks
		await expect(page.getByText(/configuration|config/i).first()).toBeVisible();
	});

	test('container detail shows podman/docker pull command', async ({ page }) => {
		await page.goto('/pull-through');

		// Find a container card and click it
		const containerCard = page.locator('[data-slot="card"]', { hasText: 'Container' }).first();
		if ((await containerCard.count()) > 0) {
			await containerCard.click();
			await expect(page.getByText(/podman pull/)).toBeVisible();
			await expect(page.getByText(/docker pull/)).toBeVisible();
		}
	});

	test('container detail shows registry mirror config', async ({ page }) => {
		await page.goto('/pull-through');

		const containerCard = page.locator('[data-slot="card"]', { hasText: 'Container' }).first();
		if ((await containerCard.count()) > 0) {
			await containerCard.click();
			// Should show daemon.json or registries.conf config
			await expect(page.getByText(/daemon\.json|registries\.conf/).first()).toBeVisible();
		}
	});

	test('python detail shows pip and uv config', async ({ page }) => {
		await page.goto('/pull-through');

		const pypiCard = page.locator('[data-slot="card"]', { hasText: 'PyPI' }).first();
		if ((await pypiCard.count()) > 0) {
			await pypiCard.click();
			await expect(page.getByText(/pip install/)).toBeVisible();
			await expect(page.getByText(/uv/)).toBeVisible();
			// Should show pyproject.toml config
			await expect(page.getByText(/pyproject\.toml/)).toBeVisible();
		}
	});

	test('npm detail shows npm and pnpm config', async ({ page }) => {
		await page.goto('/pull-through');

		const npmCard = page.locator('[data-slot="card"]', { hasText: /^npm$/ }).first();
		if ((await npmCard.count()) > 0) {
			await npmCard.click();
			await expect(page.getByText(/npm install/)).toBeVisible();
			await expect(page.getByText(/\.npmrc/)).toBeVisible();
		}
	});

	test('shows not found for nonexistent entry', async ({ page }) => {
		await page.goto('/pull-through/nonexistent-cache');
		await expect(page.getByText(/not found/i)).toBeVisible();
	});
});
