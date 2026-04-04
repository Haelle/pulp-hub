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

		const authState = await page.evaluate(() => {
			const raw = sessionStorage.getItem('pulphub_auth');
			return raw ? JSON.parse(raw) : null;
		});
		expect(authState).toBeTruthy();
		expect(authState.authMode).toBe('session');
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
		// Override: /auth/login/ returns 404 — simulates a Pulp without session auth
		await page.route('**/auth/login/', (route) =>
			route.fulfill({ status: 404, body: 'Not found' })
		);

		await page.goto('/');
		await page.fill('input[name="url"]', PULP_URL);
		await page.fill('input[name="username"]', PULP_USER);
		await page.fill('input[name="password"]', PULP_PASS);
		await page.click('button[type="submit"]');

		await expect(page).toHaveURL('/images');

		const authState = await page.evaluate(() => {
			const raw = sessionStorage.getItem('pulphub_auth');
			return raw ? JSON.parse(raw) : null;
		});
		expect(authState).toBeTruthy();
		expect(authState.authMode).toBe('basic');
		expect(authState.password).toBeTruthy();
	});

	// SKIP: POST /auth/logout/ flushes the real Django session in Pulp during
	// recording, which invalidates the sessionid stored in subsequent replays
	// and pollutes any later tape with 401s. Re-enable once we choose a
	// strategy (proxy short-circuit / targeted page.route mock / test reorder).
	test.skip('session auth logout clears session', async ({ page }) => {
		await page.goto('/');
		await page.fill('input[name="url"]', PULP_URL);
		await page.fill('input[name="username"]', PULP_USER);
		await page.fill('input[name="password"]', PULP_PASS);
		await page.click('button[type="submit"]');

		await expect(page).toHaveURL('/images');

		await page.click('button:has-text("Logout")');
		await expect(page).toHaveURL('/');

		const authState = await page.evaluate(() => sessionStorage.getItem('pulphub_auth'));
		expect(authState).toBeNull();
	});
});
