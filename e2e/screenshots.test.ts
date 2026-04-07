import { test, expect } from '@playwright/test';
import path from 'path';
import { login } from './helpers/login';

const SCREENSHOT_DIR = path.join('docs', 'screenshots');

test('capture screenshots for docs', async ({ page }) => {
	test.setTimeout(120_000);
	await page.setViewportSize({ width: 1280, height: 720 });

	// 1. Login page
	await page.goto('/');
	await expect(page.locator('[data-slot="card-title"]')).toContainText('PulpHub');
	await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'login.png'), fullPage: false });

	// 2. Images page (light mode)
	await login(page);
	await expect(page.locator('[data-slot="card"]').first()).toBeVisible();
	await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'repositories.png'), fullPage: false });

	// 3. Repository detail with tags
	await page.goto('/images/dockerhub-cache%2Flibrary%2Falpine');
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
	await expect(page.locator('h2', { hasText: 'Quick pull' })).toBeVisible();
	await page.screenshot({
		path: path.join(SCREENSHOT_DIR, 'pull-through-container.png'),
		fullPage: true
	});

	// 8. Pull-through detail — PyPI
	await page.goto('/pull-through');
	await expect(page.locator('[data-slot="card"]').first()).toBeVisible();
	await page.locator('[data-slot="card"]', { hasText: 'PyPI' }).first().click();
	await expect(page.locator('h2', { hasText: 'Quick install' })).toBeVisible();
	await page.screenshot({
		path: path.join(SCREENSHOT_DIR, 'pull-through-pypi.png'),
		fullPage: true
	});

	// 9. Pull-through detail — npm
	await page.goto('/pull-through');
	await expect(page.locator('[data-slot="card"]').first()).toBeVisible();
	await page.locator('[data-slot="card"]', { hasText: 'npm' }).first().click();
	await expect(page.locator('h2', { hasText: 'Quick install' })).toBeVisible();
	await page.screenshot({
		path: path.join(SCREENSHOT_DIR, 'pull-through-npm.png'),
		fullPage: true
	});

	// 10. Users list
	await page.goto('/users');
	await expect(page.locator('table tbody tr').first()).toBeVisible();
	await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'users.png'), fullPage: false });

	// 11. npm list
	await page.goto('/npm');
	await expect(page.locator('[data-slot="card"]').first()).toBeVisible();
	await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'npm.png'), fullPage: false });

	// 12. npm detail
	await page.locator('[data-slot="card"]').first().click();
	await expect(page.locator('h2', { hasText: 'Cached versions' })).toBeVisible();
	await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'npm-detail.png'), fullPage: true });

	// 13. PyPI list
	await page.goto('/python');
	await expect(page.locator('[data-slot="card"]').first()).toBeVisible();
	await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'python.png'), fullPage: false });

	// 14. PyPI detail
	await page.locator('[data-slot="card"]').first().click();
	await expect(page.locator('h2', { hasText: 'Cached versions' })).toBeVisible();
	await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'python-detail.png'), fullPage: true });

	// 15. Tasks list
	await page.goto('/tasks');
	await expect(page.locator('tbody tr').first()).toBeVisible();
	await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'tasks.png'), fullPage: false });

	// 16. Task detail (uses the same UUID as e2e/tasks.test.ts)
	await page.goto('/tasks/019d651d-bf09-7241-a619-a23d1768d302');
	await expect(page.locator('h1')).toBeVisible();
	await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'task-detail.png'), fullPage: true });

	// 17. Workers tab
	await page.goto('/tasks');
	await page.getByRole('button', { name: 'Workers', exact: true }).click();
	await expect(page.locator('tbody tr').first()).toBeVisible();
	await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'workers.png'), fullPage: false });

	// 18. Images in dark mode
	await page.goto('/images');
	await expect(page.locator('[data-slot="card"]').first()).toBeVisible();
	await page.evaluate(() => {
		document.documentElement.classList.add('dark');
	});
	// Small delay for styles to apply
	await page.waitForTimeout(200);
	await page.screenshot({
		path: path.join(SCREENSHOT_DIR, 'repositories-dark.png'),
		fullPage: false
	});
});
