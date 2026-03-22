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

test.describe('npm packages list page', () => {
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

	test('displays package cards', async ({ page }) => {
		await page.goto('/npm');
		const cards = page.locator('[data-testid="npm-package-card"]');
		await expect(cards.first()).toBeVisible();
	});

	test('package card shows name and version', async ({ page }) => {
		await page.goto('/npm');
		const card = page.locator('[data-testid="npm-package-card"]').first();
		await expect(card.locator('[data-slot="card-title"]')).toBeVisible();
		await expect(card.locator('[data-slot="card-description"]')).toBeVisible();
	});

	test('package card shows source distribution', async ({ page }) => {
		await page.goto('/npm');
		const card = page.locator('[data-testid="npm-package-card"]').first();
		await expect(card.locator('[data-slot="badge"]')).toBeVisible();
	});

	test('text filter narrows results', async ({ page }) => {
		await page.goto('/npm');
		await expect(page.locator('[data-testid="npm-package-card"]').first()).toBeVisible();
		const filterInput = page.getByPlaceholder(/search|filter/i);
		await filterInput.fill('is-odd');
		const cards = page.locator('[data-testid="npm-package-card"]');
		await expect(cards.first()).toBeVisible();
	});

	test('text filter with no match shows empty state', async ({ page }) => {
		await page.goto('/npm');
		await expect(page.locator('[data-testid="npm-package-card"]').first()).toBeVisible();
		const filterInput = page.getByPlaceholder(/search|filter/i);
		await filterInput.fill('zzz-nonexistent-zzz');
		await expect(page.getByText('No npm packages found')).toBeVisible();
	});

	test('distribution filter checkboxes are visible', async ({ page }) => {
		await page.goto('/npm');
		await expect(page.locator('[data-testid="npm-package-card"]').first()).toBeVisible();
		const checkbox = page.locator('input[type="checkbox"]').first();
		await expect(checkbox).toBeVisible();
	});

	test('package card links to detail page', async ({ page }) => {
		await page.goto('/npm');
		await page.locator('[data-testid="npm-package-card"]').first().click();
		await expect(page).toHaveURL(/\/npm\/packages\//);
	});

	test('redirects to login if not authenticated', async ({ browser }) => {
		const context = await browser.newContext();
		const freshPage = await context.newPage();
		await freshPage.goto('/npm');
		await expect(freshPage).toHaveURL('/');
		await context.close();
	});
});

test.describe('npm package detail page', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('navigable from list page', async ({ page }) => {
		await page.goto('/npm');
		await expect(page.locator('[data-testid="npm-package-card"]').first()).toBeVisible();
		await page.locator('[data-testid="npm-package-card"]').first().click();
		await expect(page).toHaveURL(/\/npm\/packages\//);
		await expect(page.locator('h1')).toBeVisible();
	});

	test('displays package name and version badge', async ({ page }) => {
		await page.goto('/npm');
		await expect(page.locator('[data-testid="npm-package-card"]').first()).toBeVisible();
		await page.locator('[data-testid="npm-package-card"]').first().click();
		await expect(page).toHaveURL(/\/npm\/packages\//);
		await expect(page.locator('h1')).toBeVisible();
		await expect(page.locator('[data-slot="badge"]').first()).toBeVisible();
	});

	test('shows tarball path', async ({ page }) => {
		await page.goto('/npm');
		await expect(page.locator('[data-testid="npm-package-card"]').first()).toBeVisible();
		await page.locator('[data-testid="npm-package-card"]').first().click();
		await expect(page).toHaveURL(/\/npm\/packages\//);
		await expect(page.getByText(/\.tgz/).first()).toBeVisible();
	});

	test('shows source distribution', async ({ page }) => {
		await page.goto('/npm');
		await expect(page.locator('[data-testid="npm-package-card"]').first()).toBeVisible();
		await page.locator('[data-testid="npm-package-card"]').first().click();
		await expect(page).toHaveURL(/\/npm\/packages\//);
		// Source distribution should be visible (e.g. npmjs-cache or npm-registry)
		await expect(page.getByText('Source:').first()).toBeVisible();
	});

	test('shows other cached versions when available', async ({ page }) => {
		// is-odd has multiple versions (0.1.2 and 3.0.1)
		await page.goto('/npm/packages/is-odd%403.0.1');
		await expect(page.locator('h1')).toBeVisible();
		await expect(page.getByText('Other cached versions')).toBeVisible();
		await expect(page.getByText('0.1.2')).toBeVisible();
	});

	test('shows not found for nonexistent package', async ({ page }) => {
		await page.goto('/npm/packages/zzz-fake%403.0.0');
		await expect(page.getByText(/not found/i)).toBeVisible();
	});
});
