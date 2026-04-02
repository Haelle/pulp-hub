import { test, expect } from '@playwright/test';
import { login } from './helpers/login';
import { testListPage, testDetailPage } from './helpers/shared-list-tests';

test.describe('PyPI packages list page', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	testListPage({
		route: '/python',
		title: 'PyPI',
		itemSelector: '[data-testid="python-package-card"]',
		filterText: 'requests',
		emptyText: 'No PyPI packages found',
		detailUrlPattern: /\/python\/packages\//,
		hasCliHint: true,
		hasSourceFilter: true
	});

	// PyPI-specific: one card per package name
	test('displays one card per package name', async ({ page }) => {
		await page.goto('/python');
		const flaskCards = page.locator('[data-testid="python-package-card"]', { hasText: 'Flask' });
		await expect(flaskCards).toHaveCount(1);
	});
});

test.describe('PyPI package detail page', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	testDetailPage({
		listRoute: '/python',
		directRoute: '/python/packages/Flask',
		itemSelector: '[data-testid="python-package-card"]',
		detailUrlPattern: /\/python\/packages\//,
		notFoundRoute: '/python/packages/zzz-fake-pkg',
		hasCliHint: false
	});

	test('shows versions table', async ({ page }) => {
		await page.goto('/python/packages/Flask');
		await expect(page.locator('h1')).toBeVisible();
		const rows = page.locator('table tbody tr');
		await expect(rows.first()).toBeVisible();
	});

	test('version row shows version and filename', async ({ page }) => {
		await page.goto('/python/packages/Flask');
		const row = page.locator('table tbody tr').first();
		await expect(row.locator('[data-slot="badge"]')).toBeVisible();
		await expect(row.getByText(/\.whl|\.tar\.gz/)).toBeVisible();
	});

	test('shows install command', async ({ page }) => {
		await page.goto('/python/packages/Flask');
		await expect(page.getByText(/pip install.*--index-url/).first()).toBeVisible();
	});

	test('shows source distribution', async ({ page }) => {
		await page.goto('/python/packages/Flask');
		await expect(page.getByText('Source:').first()).toBeVisible();
	});

	test('links to pypi.org', async ({ page }) => {
		await page.goto('/python/packages/Flask');
		const link = page.locator('a[href="https://pypi.org/project/Flask/"]');
		await expect(link).toBeVisible();
		await expect(link).toHaveText('pypi.org');
	});
});
