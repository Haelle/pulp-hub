import { test, expect } from '@playwright/test';
import { login } from './helpers/login';
import { testListPage, testDetailPage } from './helpers/shared-list-tests';

test.describe('npm packages list page', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	testListPage({
		route: '/npm',
		navLabel: 'npm',
		title: 'npm',
		itemSelector: '[data-testid="npm-package-card"]',
		filterText: 'is-odd',
		emptyText: 'No npm packages found',
		detailUrlPattern: /\/npm\/packages\//,
		hasCliHint: true,
		hasSourceFilter: true
	});

	// npm-specific: one card per package name
	test('displays one card per package name', async ({ page }) => {
		await page.goto('/npm');
		const isOddCards = page.locator('[data-testid="npm-package-card"]', { hasText: 'is-odd' });
		await expect(isOddCards).toHaveCount(1);
	});
});

test.describe('npm package detail page', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	testDetailPage({
		listRoute: '/npm',
		directRoute: '/npm/packages/is-odd',
		itemSelector: '[data-testid="npm-package-card"]',
		detailUrlPattern: /\/npm\/packages\//,
		notFoundRoute: '/npm/packages/zzz-fake-pkg',
		hasCliHint: false
	});

	test('shows versions table', async ({ page }) => {
		await page.goto('/npm/packages/is-odd');
		await expect(page.locator('h1')).toBeVisible();
		const rows = page.locator('table tbody tr');
		await expect(rows.first()).toBeVisible();
		await expect(rows).toHaveCount(2);
	});

	test('version row shows version and tarball', async ({ page }) => {
		await page.goto('/npm/packages/is-odd');
		const row = page.locator('table tbody tr').first();
		await expect(row.locator('[data-slot="badge"]')).toBeVisible();
		await expect(row.getByText(/\.tgz/)).toBeVisible();
	});

	test('shows install command', async ({ page }) => {
		await page.goto('/npm/packages/is-odd');
		await expect(page.getByText(/npm install.*--registry/).first()).toBeVisible();
	});

	test('shows source distribution', async ({ page }) => {
		await page.goto('/npm/packages/is-odd');
		await expect(page.getByText('Source:').first()).toBeVisible();
	});

	test('links to npmjs.com', async ({ page }) => {
		await page.goto('/npm/packages/is-odd');
		const link = page.locator('a[href="https://www.npmjs.com/package/is-odd"]');
		await expect(link).toBeVisible();
		await expect(link).toHaveText('npmjs.com');
	});
});
