import { test, expect } from '@playwright/test';
import { PULP_URL, PULP_USER, PULP_PASS } from './helpers/login';

test.describe('Session Auth', () => {
	test('logs in via session auth and redirects to images', async ({ page }) => {
		await page.goto('/');
		await page.fill('input[name="url"]', PULP_URL);
		await page.fill('input[name="username"]', PULP_USER);
		await page.fill('input[name="password"]', PULP_PASS);
		await page.click('button[type="submit"]');

		await expect(page).toHaveURL('/images');
		await expect(page.locator('h1')).toContainText('Images');
	});

	test('uses session auth mode when server supports it', async ({ page }) => {
		await page.goto('/');
		await page.fill('input[name="url"]', PULP_URL);
		await page.fill('input[name="username"]', PULP_USER);
		await page.fill('input[name="password"]', PULP_PASS);
		await page.click('button[type="submit"]');

		await expect(page).toHaveURL('/images');

		// Verify session auth is active — check sessionStorage
		const authState = await page.evaluate(() => {
			const raw = sessionStorage.getItem('pulphub_auth');
			return raw ? JSON.parse(raw) : null;
		});
		expect(authState).toBeTruthy();
		expect(authState.authMode).toBe('session');
		// Password should NOT be stored in session auth mode
		expect(authState.password).toBeFalsy();
	});

	test('shows error on invalid credentials with session auth', async ({ page }) => {
		await page.goto('/');
		await page.fill('input[name="url"]', PULP_URL);
		await page.fill('input[name="username"]', 'wrong');
		await page.fill('input[name="password"]', 'wrong');
		await page.click('button[type="submit"]');

		await expect(page.getByText('Invalid credentials')).toBeVisible();
	});

	test('falls back to basic auth when session auth is unavailable', async ({ page }) => {
		// Route /auth/login/ to return 404 — simulates a Pulp without session auth
		await page.route('**/auth/login/', (route) =>
			route.fulfill({ status: 404, body: 'Not found' })
		);

		await page.goto('/');
		await page.fill('input[name="url"]', PULP_URL);
		await page.fill('input[name="username"]', PULP_USER);
		await page.fill('input[name="password"]', PULP_PASS);
		await page.click('button[type="submit"]');

		await expect(page).toHaveURL('/images');

		// Verify basic auth mode is active
		const authState = await page.evaluate(() => {
			const raw = sessionStorage.getItem('pulphub_auth');
			return raw ? JSON.parse(raw) : null;
		});
		expect(authState).toBeTruthy();
		expect(authState.authMode).toBe('basic');
		expect(authState.password).toBeTruthy();
	});

	test('session auth logout clears session', async ({ page }) => {
		await page.goto('/');
		await page.fill('input[name="url"]', PULP_URL);
		await page.fill('input[name="username"]', PULP_USER);
		await page.fill('input[name="password"]', PULP_PASS);
		await page.click('button[type="submit"]');

		await expect(page).toHaveURL('/images');

		await page.click('button:has-text("Logout")');
		await expect(page).toHaveURL('/');

		// sessionStorage should be cleared
		const authState = await page.evaluate(() => sessionStorage.getItem('pulphub_auth'));
		expect(authState).toBeNull();
	});
});
