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

test.describe('Users page', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('navbar has Users link', async ({ page }) => {
		const link = page.getByRole('link', { name: 'Users' });
		await expect(link).toBeVisible();
	});

	test('navigate to /users via navbar', async ({ page }) => {
		await page.getByRole('link', { name: 'Users', exact: true }).click();
		await expect(page).toHaveURL('/users');
	});

	test('displays page title', async ({ page }) => {
		await page.goto('/users');
		await expect(page.locator('h1')).toContainText('Users');
	});

	test('shows cli hint', async ({ page }) => {
		await page.goto('/users');
		await expect(page.locator('[data-slot="alert-title"]')).toContainText('pulp-cli');
	});

	test('displays user rows', async ({ page }) => {
		await page.goto('/users');
		const rows = page.locator('table tbody tr');
		await expect(rows.first()).toBeVisible();
		await expect(rows).not.toHaveCount(0);
	});

	test('user row shows username', async ({ page }) => {
		await page.goto('/users');
		const rows = page.locator('table tbody tr');
		await expect(rows.first()).toBeVisible();
		await expect(page.locator('table tbody').getByText('admin')).toBeVisible();
	});

	test('shows staff badge for admin', async ({ page }) => {
		await page.goto('/users');
		await expect(page.getByText('Staff').first()).toBeVisible();
	});

	test('filter narrows results', async ({ page }) => {
		await page.goto('/users');
		const filterInput = page.getByPlaceholder(/search|filter/i);
		await filterInput.fill('captain');
		const rows = page.locator('table tbody tr');
		await expect(rows).toHaveCount(1);
	});

	test('filter with no match shows empty state', async ({ page }) => {
		await page.goto('/users');
		const filterInput = page.getByPlaceholder(/search|filter/i);
		await filterInput.fill('zzz-nonexistent-zzz');
		await expect(page.getByText(/no|aucun|empty/i)).toBeVisible();
	});

	test('redirects to login if not authenticated', async ({ browser }) => {
		const context = await browser.newContext();
		const freshPage = await context.newPage();
		await freshPage.goto('/users');
		await expect(freshPage).toHaveURL('/');
		await context.close();
	});
});
