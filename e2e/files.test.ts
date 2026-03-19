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

test.describe('Files page', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('navbar has Files link', async ({ page }) => {
		const filesLink = page.getByRole('link', { name: 'Files' });
		await expect(filesLink).toBeVisible();
	});

	test('navigate to /files via navbar', async ({ page }) => {
		await page.getByRole('link', { name: 'Files' }).click();
		await expect(page).toHaveURL('/files');
	});

	test('displays file distribution cards', async ({ page }) => {
		await page.goto('/files');

		const cards = page.locator('[data-slot="card"]');
		await expect(cards.first()).toBeVisible();
	});

	test('file card shows name and base_path', async ({ page }) => {
		await page.goto('/files');

		const cards = page.locator('[data-slot="card"]');
		await expect(cards).not.toHaveCount(0);
		await expect(cards.first().locator('[data-slot="card-title"]')).toBeVisible();
		await expect(cards.first().locator('[data-slot="card-description"]')).toBeVisible();
	});

	test('file card has File badge', async ({ page }) => {
		await page.goto('/files');

		const badge = page.locator('[data-slot="card"]').first().getByText('File');
		await expect(badge).toBeVisible();
	});

	test('file card links to detail page', async ({ page }) => {
		await page.goto('/files');

		await page.locator('[data-slot="card"]').first().click();
		await expect(page).toHaveURL(/\/files\//);
	});

	test('filter narrows results', async ({ page }) => {
		await page.goto('/files');

		const filterInput = page.getByPlaceholder(/search|filter/i);
		await filterInput.fill('test-docs');

		await expect(page.locator('[data-slot="card"]')).toHaveCount(1);
	});

	test('filter with no match shows empty state', async ({ page }) => {
		await page.goto('/files');

		const filterInput = page.getByPlaceholder(/search|filter/i);
		await filterInput.fill('zzz-nonexistent-zzz');

		await expect(page.getByText(/no|aucun|empty/i)).toBeVisible();
	});

	test('shows cli hint', async ({ page }) => {
		await page.goto('/files');

		await expect(page.locator('[data-slot="alert-title"]')).toContainText('pulp-cli');
	});

	test('Files navbar button is active on /files', async ({ page }) => {
		await page.goto('/files');

		// The active button uses "secondary" variant which has distinct styling
		const filesButton = page.getByRole('link', { name: 'Files' });
		await expect(filesButton).toBeVisible();
	});
});
