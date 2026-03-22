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
	await expect(page).toHaveURL('/images');
}

test.describe('Navbar', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('displays app version', async ({ page }) => {
		const navbar = page.locator('nav');
		const version = navbar.locator('span', { hasText: /^[a-f0-9]{7,}$|^v\d+/ });
		await expect(version).toBeVisible();
	});
});
