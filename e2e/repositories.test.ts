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

test.describe('Repositories page', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('displays repository cards', async ({ page }) => {
		await page.goto('/repositories');

		// At least one repo card should be visible (alpine from seed)
		const cards = page.locator('[data-slot="card"]');
		await expect(cards.first()).toBeVisible();
	});

	test('repo card shows name and base_path', async ({ page }) => {
		await page.goto('/repositories');

		// Each card should have a title and a description with the base_path
		const cards = page.locator('[data-slot="card"]');
		await expect(cards).not.toHaveCount(0);
		await expect(cards.first().locator('[data-slot="card-title"]')).toBeVisible();
		await expect(cards.first().locator('[data-slot="card-description"]')).toBeVisible();
	});

	test('repo card links to detail page', async ({ page }) => {
		await page.goto('/repositories');

		await page.locator('[data-slot="card"]').first().click();
		await expect(page).toHaveURL(/\/repositories\//);
	});

	test('filter narrows results', async ({ page }) => {
		await page.goto('/repositories');

		const filterInput = page.getByPlaceholder(/search|filter/i);
		await filterInput.fill('alpine');

		await expect(page.locator('[data-slot="card"]')).toHaveCount(1);
	});

	test('filter with no match shows empty state', async ({ page }) => {
		await page.goto('/repositories');

		const filterInput = page.getByPlaceholder(/search|filter/i);
		await filterInput.fill('zzz-nonexistent-zzz');

		await expect(page.getByText(/no|aucun|empty/i)).toBeVisible();
	});

	test('redirects to login if not authenticated', async ({ browser }) => {
		const context = await browser.newContext();
		const freshPage = await context.newPage();
		await freshPage.goto('/repositories');
		await expect(freshPage).toHaveURL('/');
		await context.close();
	});
});
