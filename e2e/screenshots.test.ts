import { test, expect, type Page } from '@playwright/test';
import path from 'path';

const PULP_URL = process.env.PULP_URL ?? `http://localhost:${process.env.TALKBACK_PORT ?? '8787'}`;
const PULP_USER = process.env.PULP_USER ?? 'admin';
const PULP_PASS = process.env.PULP_PASS ?? 'admin';

const SCREENSHOT_DIR = path.join('docs', 'screenshots');

async function login(page: Page) {
	await page.goto('/');
	await page.fill('input[name="url"]', PULP_URL);
	await page.fill('input[name="username"]', PULP_USER);
	await page.fill('input[name="password"]', PULP_PASS);
	await page.click('button[type="submit"]');
	await expect(page).toHaveURL('/repositories');
}

test('capture screenshots for docs', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 720 });

	// 1. Login page
	await page.goto('/');
	await expect(page.locator('[data-slot="card-title"]')).toContainText('PulpHub');
	await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'login.png'), fullPage: false });

	// 2. Repositories page (light mode)
	await login(page);
	await expect(page.locator('[data-slot="card"]').first()).toBeVisible();
	await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'repositories.png'), fullPage: false });

	// 3. Repository detail with tags
	await page.goto('/repositories/dockerhub%2Flibrary%2Falpine');
	await expect(page.locator('h1')).toBeVisible();
	await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'repo-detail.png'), fullPage: false });

	// 4. File distributions list
	await page.goto('/files');
	await expect(page.locator('[data-slot="card"]').first()).toBeVisible();
	await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'files.png'), fullPage: false });

	// 5. File content detail
	await page.goto('/files/test-docs');
	await expect(page.locator('table')).toBeVisible();
	await page.locator('tbody tr').first().locator('a').click();
	await expect(page.locator('h1')).toBeVisible();
	await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'file-content.png'), fullPage: false });

	// 6. Pull-through list
	await page.goto('/pull-through');
	await expect(page.locator('[data-slot="card"]').first()).toBeVisible();
	await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pull-through.png'), fullPage: false });

	// 7. Pull-through detail — Container (OCI)
	await page.locator('[data-slot="card"]', { hasText: 'Container' }).first().click();
	await expect(page.locator('h1')).toBeVisible();
	await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pull-through-container.png'), fullPage: true });
	await page.goBack();

	// 8. Pull-through detail — PyPI
	await page.locator('[data-slot="card"]', { hasText: 'PyPI' }).first().click();
	await expect(page.locator('h1')).toBeVisible();
	await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pull-through-pypi.png'), fullPage: true });
	await page.goBack();

	// 9. Pull-through detail — npm
	await page.locator('[data-slot="card"]', { hasText: 'npm' }).first().click();
	await expect(page.locator('h1')).toBeVisible();
	await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pull-through-npm.png'), fullPage: true });

	// 10. Repositories in dark mode
	await page.goto('/repositories');
	await expect(page.locator('[data-slot="card"]').first()).toBeVisible();
	await page.evaluate(() => {
		document.documentElement.classList.add('dark');
	});
	// Small delay for styles to apply
	await page.waitForTimeout(200);
	await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'repositories-dark.png'), fullPage: false });
});
