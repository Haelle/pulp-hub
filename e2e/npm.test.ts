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

test.describe('npm list page', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('navbar has npm link', async ({ page }) => {
		const link = page.getByRole('link', { name: 'npm', exact: true });
		await expect(link).toBeVisible();
	});

	test('navigate to /npm via navbar', async ({ page }) => {
		await page.getByRole('link', { name: 'npm', exact: true }).click();
		await expect(page).toHaveURL('/npm');
	});

	test('displays page title', async ({ page }) => {
		await page.goto('/npm');
		await expect(page.locator('h1')).toContainText('npm');
	});

	test('shows cli hint', async ({ page }) => {
		await page.goto('/npm');
		await expect(page.locator('[data-slot="alert-title"]')).toContainText('pulp-cli');
	});

	test('displays npm distribution cards', async ({ page }) => {
		await page.goto('/npm');
		const cards = page.locator('[data-slot="card"]');
		await expect(cards.first()).toBeVisible();
		await expect(cards).not.toHaveCount(0);
	});

	test('card shows name and npm badge', async ({ page }) => {
		await page.goto('/npm');
		const card = page.locator('[data-slot="card"]').first();
		await expect(card.locator('[data-slot="card-title"]')).toBeVisible();
		await expect(card.locator('[data-slot="badge"]')).toContainText('npm');
	});

	test('card links to detail page', async ({ page }) => {
		await page.goto('/npm');
		await page.locator('[data-slot="card"]').first().click();
		await expect(page).toHaveURL(/\/npm\//);
	});

	test('filter narrows results', async ({ page }) => {
		await page.goto('/npm');
		const filterInput = page.getByPlaceholder(/search|filter/i);
		await filterInput.fill('npm-utils');
		const cards = page.locator('[data-slot="card"]');
		await expect(cards).toHaveCount(1);
	});

	test('filter with no match shows empty state', async ({ page }) => {
		await page.goto('/npm');
		const filterInput = page.getByPlaceholder(/search|filter/i);
		await filterInput.fill('zzz-nonexistent-zzz');
		await expect(page.getByText('No npm repositories found')).toBeVisible();
	});

	test('redirects to login if not authenticated', async ({ browser }) => {
		const context = await browser.newContext();
		const freshPage = await context.newPage();
		await freshPage.goto('/npm');
		await expect(freshPage).toHaveURL('/');
		await context.close();
	});
});

test.describe('npm detail page', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('navigable from list page', async ({ page }) => {
		await page.goto('/npm');
		await page.locator('[data-slot="card"]').first().click();
		await expect(page).toHaveURL(/\/npm\//);
		await expect(page.locator('h1')).toBeVisible();
	});

	test('displays name and npm badge', async ({ page }) => {
		await page.goto('/npm');
		await page.locator('[data-slot="card"]').first().click();
		await expect(page).toHaveURL(/\/npm\//);
		await expect(page.locator('h1')).toBeVisible();
		await expect(page.locator('h1 + [data-slot="badge"]')).toBeVisible();
	});

	test('shows upstream registry URL', async ({ page }) => {
		await page.goto('/npm');
		await page.locator('[data-slot="card"]').first().click();
		await expect(page).toHaveURL(/\/npm\//);
		await expect(page.getByText(/https?:\/\//).first()).toBeVisible();
	});

	test('shows npm install registry command', async ({ page }) => {
		await page.goto('/npm');
		await page.locator('[data-slot="card"]').first().click();
		await expect(page).toHaveURL(/\/npm\//);
		await expect(page.getByText(/npm.*--registry/).first()).toBeVisible();
	});

	test('shows cli hint', async ({ page }) => {
		await page.goto('/npm');
		await page.locator('[data-slot="card"]').first().click();
		await expect(page).toHaveURL(/\/npm\//);
		await expect(page.locator('[data-slot="alert-title"]')).toContainText('pulp-cli');
	});

	test('shows not found for nonexistent entry', async ({ page }) => {
		await page.goto('/npm/zzz-nonexistent-zzz');
		await expect(page.getByText(/not found/i)).toBeVisible();
	});
});
