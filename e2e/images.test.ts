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

test.describe('Images page', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('navbar has Images link', async ({ page }) => {
		const link = page.getByRole('link', { name: 'Images', exact: true });
		await expect(link).toBeVisible();
	});

	test('navigate to /images via navbar', async ({ page }) => {
		await page.getByRole('link', { name: 'Images', exact: true }).click();
		await expect(page).toHaveURL('/images');
	});

	test('displays image cards', async ({ page }) => {
		await page.goto('/images');
		const cards = page.locator('[data-slot="card"]');
		await expect(cards.first()).toBeVisible();
	});

	test('card shows name and source badge', async ({ page }) => {
		await page.goto('/images');
		const card = page.locator('[data-slot="card"]').first();
		await expect(card.locator('[data-slot="card-title"]')).toBeVisible();
		await expect(card.locator('[data-slot="badge"]')).toBeVisible();
	});

	test('card links to detail page', async ({ page }) => {
		await page.goto('/images');
		await page.locator('[data-slot="card"]').first().click();
		await expect(page).toHaveURL(/\/images\//);
	});

	test('filter narrows results', async ({ page }) => {
		await page.goto('/images');
		const filterInput = page.getByPlaceholder(/search|filter/i);
		await filterInput.fill('alpine');
		await expect(page.locator('[data-slot="card"]')).toHaveCount(1);
	});

	test('filter with no match shows empty state', async ({ page }) => {
		await page.goto('/images');
		const filterInput = page.getByPlaceholder(/search|filter/i);
		await filterInput.fill('zzz-nonexistent-zzz');
		await expect(page.getByText(/no.*found/i)).toBeVisible();
	});

	test('source filter checkboxes are visible', async ({ page }) => {
		await page.goto('/images');
		await expect(page.locator('[data-slot="card"]').first()).toBeVisible();
		const checkbox = page.locator('input[type="checkbox"]').first();
		await expect(checkbox).toBeVisible();
	});

	test('redirects to login if not authenticated', async ({ browser }) => {
		const context = await browser.newContext();
		const freshPage = await context.newPage();
		await freshPage.goto('/images');
		await expect(freshPage).toHaveURL('/');
		await context.close();
	});
});
