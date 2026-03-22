import { test, expect } from '@playwright/test';
import { login } from './helpers/login';
import { testDetailPage } from './helpers/shared-list-tests';

test.describe('Image detail page', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	testDetailPage({
		listRoute: '/images',
		directRoute: '/images/dockerhub%2Flibrary%2Falpine',
		detailUrlPattern: /\/images\//,
		notFoundRoute: '/images/nonexistent-repo',
		hasCliHint: true
	});

	test('displays pull command', async ({ page }) => {
		await page.goto('/images/dockerhub%2Flibrary%2Falpine');
		await expect(page.getByText(/podman pull/)).toBeVisible();
	});

	test('pull command has copy button', async ({ page }) => {
		await page.goto('/images/dockerhub%2Flibrary%2Falpine');
		await expect(page.getByRole('button', { name: /copy/i }).first()).toBeVisible();
	});

	test('displays tags table', async ({ page }) => {
		await page.goto('/images/dockerhub%2Flibrary%2Falpine');
		await expect(page.locator('table')).toBeVisible();
		await expect(page.locator('tbody tr')).not.toHaveCount(0);
	});
});
