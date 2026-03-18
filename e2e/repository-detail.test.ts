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
	await expect(page).toHaveURL('/repositories');
}

test.describe('Repository detail page', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('displays repo name and registry path', async ({ page }) => {
		await page.goto('/repositories/dockerhub%2Flibrary%2Falpine');

		await expect(page.locator('h1')).toContainText('alpine');
		// Pull command contains the registry path with the Pulp host
		await expect(page.getByText(/podman pull.*dockerhub\/library\/alpine/)).toBeVisible();
	});

	test('displays tags table', async ({ page }) => {
		await page.goto('/repositories/dockerhub%2Flibrary%2Falpine');

		// Should show tags in the table
		await expect(page.locator('table')).toBeVisible();
		await expect(page.locator('tbody tr')).not.toHaveCount(0);
	});

	test('displays pull command', async ({ page }) => {
		await page.goto('/repositories/dockerhub%2Flibrary%2Falpine');

		await expect(page.getByText(/podman pull/)).toBeVisible();
	});

	test('pull command has copy button', async ({ page }) => {
		await page.goto('/repositories/dockerhub%2Flibrary%2Falpine');

		const copyButton = page.getByRole('button', { name: /copy/i });
		await expect(copyButton).toBeVisible();
	});

	test('shows cli hint', async ({ page }) => {
		await page.goto('/repositories/dockerhub%2Flibrary%2Falpine');

		await expect(page.locator('[data-slot="alert-title"]')).toContainText('pulp-cli');
	});

	test('returns 404 for nonexistent repo', async ({ page }) => {
		const response = await page.goto('/repositories/nonexistent-repo');
		expect(response?.status()).toBe(404);
	});

	test('navigable from repositories list', async ({ page }) => {
		await page.goto('/repositories');

		// Click on the alpine card
		await page.locator('[data-slot="card"]', { hasText: 'alpine' }).click();
		await expect(page).toHaveURL(/\/repositories\/dockerhub/);
		await expect(page.locator('h1')).toContainText('alpine');
	});
});
