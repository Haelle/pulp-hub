import { test, expect } from '@playwright/test';
import { login, PULP_URL } from './helpers/login';

test.describe('Login', () => {
	test('redirects to / when accessing protected page without session', async ({ page }) => {
		await page.goto('/images');
		await expect(page).toHaveURL('/');
		await expect(page.locator('[data-slot="card-title"]')).toContainText('PulpHub');
	});

	test('shows error on invalid credentials', async ({ page }) => {
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

	test('logs in and redirects to images', async ({ page }) => {
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
	// SKIP: POST /auth/logout/ flushes the real Django session in Pulp during
	// recording, which invalidates the sessionid stored in subsequent replays
	// and pollutes any later tape with 401s. Re-enable once we choose a
	// strategy (proxy short-circuit / targeted page.route mock / test reorder).
	test.skip('logs out and redirects to login', async ({ page }) => {
		await login(page);
		await page.click('button:has-text("Logout")');
		await expect(page).toHaveURL('/');
		await expect(page.locator('[data-slot="card-title"]')).toContainText('PulpHub');
	});

	// SKIP: see comment above on the previous logout test.
	test.skip('cannot access protected page after logout', async ({ page }) => {
		await login(page);
		await page.click('button:has-text("Logout")');
		await expect(page).toHaveURL('/');
		await page.goto('/images');
		await expect(page).toHaveURL('/');
	});
});
