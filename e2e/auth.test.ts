import { test, expect, type Page } from '@playwright/test';

const PULP_URL = process.env.PULP_URL ?? 'https://pulp.local:8443';
const PULP_USER = process.env.PULP_USER ?? 'admin';
const PULP_PASS = process.env.PULP_PASS ?? 'admin';

async function login(page: Page) {
	await page.goto('/');
	await page.fill('input[name="url"]', PULP_URL);
	await page.fill('input[name="username"]', PULP_USER);
	await page.fill('input[name="password"]', PULP_PASS);
	await page.click('button[type="submit"]');
	await expect(page).toHaveURL('/status');
}

test.describe('Login', () => {
	test('redirects to / when accessing /status without session', async ({ page }) => {
		await page.goto('/status');
		await expect(page).toHaveURL('/');
		await expect(page.locator('[data-slot="card-title"]')).toContainText('PulpHub');
	});

	test('shows error on invalid credentials', async ({ page }) => {
		await page.goto('/');
		await page.fill('input[name="url"]', PULP_URL);
		await page.fill('input[name="username"]', 'wrong');
		await page.fill('input[name="password"]', 'wrong');
		await page.click('button[type="submit"]');

		await expect(page.locator('.text-destructive')).toBeVisible();
	});

	test('logs in with valid credentials and shows status', async ({ page }) => {
		await login(page);

		await expect(page.locator('h1')).toContainText('Pulp Status');
		await expect(page.locator('nav')).toContainText(PULP_URL);
	});
});

test.describe('Status page', () => {
	test('displays Pulp status JSON', async ({ page }) => {
		await login(page);

		const pre = page.locator('pre');
		await expect(pre).toBeVisible();
		const text = await pre.textContent();
		expect(text).toContain('versions');
	});
});

test.describe('Logout', () => {
	test('logs out and redirects to login', async ({ page }) => {
		await login(page);

		await page.click('button:has-text("Logout")');
		await expect(page).toHaveURL('/');
		await expect(page.locator('[data-slot="card-title"]')).toContainText('PulpHub');
	});

	test('cannot access /status after logout', async ({ page }) => {
		await login(page);

		await page.click('button:has-text("Logout")');
		await expect(page).toHaveURL('/');

		await page.goto('/status');
		await expect(page).toHaveURL('/');
	});
});
