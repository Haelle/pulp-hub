import { test, expect } from '@playwright/test';
import { login } from './helpers/login';
import { testListPage, testDetailPage } from './helpers/shared-list-tests';

test.describe('Files page', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	testListPage({
		route: '/files',
		navLabel: 'Files',
		title: 'Files',
		filterText: 'test-docs',
		detailUrlPattern: /\/files\//,
		hasCliHint: true
	});

	// Files-specific: badge
	test('file card has File badge', async ({ page }) => {
		await page.goto('/files');
		const badge = page.locator('[data-slot="card"]').first().getByText('File');
		await expect(badge).toBeVisible();
	});
});

test.describe('File detail page', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	testDetailPage({
		listRoute: '/files',
		directRoute: '/files/test-docs',
		detailUrlPattern: /\/files\//,
		notFoundRoute: '/files/nonexistent-repo',
		hasCliHint: true
	});

	test('displays files table with relative paths', async ({ page }) => {
		await page.goto('/files/test-docs');
		await expect(page.locator('table')).toBeVisible();
		await expect(page.locator('tbody tr')).not.toHaveCount(0);
		await expect(page.getByText('README.md')).toBeVisible();
	});

	test('file rows link to content detail', async ({ page }) => {
		await page.goto('/files/test-docs');
		await page.locator('tbody tr').first().locator('a').click();
		await expect(page).toHaveURL(/\/files\/test-docs\/content\//);
	});

	test('shows sha256 truncated in table', async ({ page }) => {
		await page.goto('/files/test-docs');
		const hashCell = page.locator('tbody tr').first().locator('td').nth(1);
		const text = await hashCell.textContent();
		expect(text!.trim().length).toBeLessThanOrEqual(12);
	});
});

test.describe('File content detail page', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('displays file name and sha256', async ({ page }) => {
		await page.goto('/files/test-docs');
		await page.locator('tbody tr').first().locator('a').click();
		await expect(page).toHaveURL(/\/files\/test-docs\/content\//);
		await expect(page.locator('h1')).toBeVisible();
		await expect(page.getByText(/^[a-f0-9]{64}$/)).toBeVisible();
	});

	test('displays file size', async ({ page }) => {
		await page.goto('/files/test-docs');
		await page.locator('tbody tr').first().locator('a').click();
		await expect(page.getByText(/\d+(\.\d+)?\s*(B|KB|MB|GB)/)).toBeVisible();
	});

	test('shows cli hint', async ({ page }) => {
		await page.goto('/files/test-docs');
		await page.locator('tbody tr').first().locator('a').click();
		await expect(page.locator('[data-slot="alert-title"]')).toContainText('pulp-cli');
	});

	test('shows copy button for sha256', async ({ page }) => {
		await page.goto('/files/test-docs');
		await page.locator('tbody tr').first().locator('a').click();
		await expect(page.getByRole('button', { name: /copy/i }).first()).toBeVisible();
	});

	test('navigable from file detail table', async ({ page }) => {
		await page.goto('/files/test-docs');
		const firstFileLink = page.locator('tbody tr').first().locator('a');
		const fileName = await firstFileLink.textContent();
		await firstFileLink.click();
		await expect(page.locator('h1')).toContainText(fileName!.trim());
	});
});
