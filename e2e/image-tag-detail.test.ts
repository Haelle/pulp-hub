import { test, expect } from '@playwright/test';
import { login } from './helpers/login';

test.describe('Image tag detail page', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('displays tag name and digest', async ({ page }) => {
		await page.goto('/images/dockerhub-cache%2Flibrary%2Falpine/tags/latest');
		await expect(page.locator('h1')).toContainText('latest');
		await expect(page.getByText(/sha256:/)).toBeVisible();
	});

	test('displays pull command with tag', async ({ page }) => {
		await page.goto('/images/dockerhub-cache%2Flibrary%2Falpine/tags/latest');
		await expect(page.getByText(/podman pull.*:latest/)).toBeVisible();
	});

	test('shows architecture and OS badges for multi-arch', async ({ page }) => {
		await page.goto('/images/dockerhub-cache%2Flibrary%2Falpine/tags/latest');
		await expect(page.locator('table')).toBeVisible();
		// Wait for the Promise.all over listed_manifests to resolve and the
		// platform rows to be rendered. The page assigns `platforms` atomically
		// after Promise.all settles, so seeing one row guarantees all are loaded.
		// Without this wait, Playwright closes the page before all
		// getManifest() calls complete, leaving some platform tapes unrecorded.
		await expect(page.locator('table tbody tr').first()).toBeVisible();
	});

	test('shows cli hint', async ({ page }) => {
		await page.goto('/images/dockerhub-cache%2Flibrary%2Falpine/tags/latest');
		await expect(page.locator('[data-slot="alert-title"]')).toContainText('pulp-cli');
	});

	test('shows not found for nonexistent tag', async ({ page }) => {
		await page.goto('/images/dockerhub-cache%2Flibrary%2Falpine/tags/nonexistent');
		await expect(page.getByText(/not found/i)).toBeVisible();
	});

	test('navigable from image detail', async ({ page }) => {
		await page.goto('/images/dockerhub-cache%2Flibrary%2Falpine');
		await page.locator('tbody a').first().click();
		await expect(page).toHaveURL(/\/tags\//);
	});
});
