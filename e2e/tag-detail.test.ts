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

test.describe('Tag detail page', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('displays tag name and digest', async ({ page }) => {
		await page.goto('/images/dockerhub%2Flibrary%2Falpine/tags/latest');

		await expect(page.locator('h1')).toContainText('latest');
		// Digest should be visible (sha256:...)
		await expect(page.getByText(/sha256:/)).toBeVisible();
	});

	test('displays pull command with tag', async ({ page }) => {
		await page.goto('/images/dockerhub%2Flibrary%2Falpine/tags/latest');

		await expect(page.getByText(/podman pull.*:latest/)).toBeVisible();
	});

	test('shows architecture and OS badges for multi-arch', async ({ page }) => {
		await page.goto('/images/dockerhub%2Flibrary%2Falpine/tags/latest');

		// Multi-arch manifest should list platforms
		await expect(page.locator('table')).toBeVisible();
	});

	test('shows layers for single-arch manifest', async ({ page }) => {
		await page.goto('/images/dockerhub%2Flibrary%2Falpine/tags/3.18');

		// Should show either layers or platform list
		await expect(page.locator('main, [data-testid="tag-content"]')).toBeVisible();
	});

	test('shows cli hint', async ({ page }) => {
		await page.goto('/images/dockerhub%2Flibrary%2Falpine/tags/latest');

		await expect(page.locator('[data-slot="alert-title"]')).toContainText('pulp-cli');
	});

	test('shows not found for nonexistent tag', async ({ page }) => {
		await page.goto('/images/dockerhub%2Flibrary%2Falpine/tags/nonexistent');
		await expect(page.getByText(/not found/i)).toBeVisible();
	});

	test('navigable from repository detail', async ({ page }) => {
		await page.goto('/images/dockerhub%2Flibrary%2Falpine');

		// Click on a tag link
		await page.locator('tbody a').first().click();
		await expect(page).toHaveURL(/\/tags\//);
	});
});
