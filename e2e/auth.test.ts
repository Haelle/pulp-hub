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

test.describe('Login', () => {
	test('redirects to / when accessing protected page without session', async ({ page }) => {
		await page.goto('/images');
		await expect(page).toHaveURL('/');
		await expect(page.locator('[data-slot="card-title"]')).toContainText('PulpHub');
	});

	test('shows error on invalid credentials', async ({ page }) => {
		// Mock the login endpoint to return 401
		await page.route('**/pulp/api/v3/distributions/container/container/?limit=0', (route) =>
			route.fulfill({
				status: 401,
				body: '{"detail":"Authentication credentials were not provided."}'
			})
		);

		await page.goto('/');
		await page.fill('input[name="url"]', PULP_URL);
		await page.fill('input[name="username"]', 'wrong');
		await page.fill('input[name="password"]', 'wrong');
		await page.click('button[type="submit"]');

		await expect(page.getByText('Invalid credentials')).toBeVisible();
	});

	test('logs in and redirects to repositories', async ({ page }) => {
		await login(page);

		await expect(page.locator('h1')).toContainText('Images');
		await expect(page.locator('nav')).toContainText(PULP_URL);
	});
});

test.describe('Status page', () => {
	test('displays Pulp status JSON', async ({ page }) => {
		await login(page);
		await page.goto('/status');

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

	test('cannot access protected page after logout', async ({ page }) => {
		await login(page);

		await page.click('button:has-text("Logout")');
		await expect(page).toHaveURL('/');

		await page.goto('/images');
		await expect(page).toHaveURL('/');
	});
});
