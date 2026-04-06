import { test, expect } from '@playwright/test';
import { login, PULP_URL, PULP_USER, PULP_PASS } from './helpers/login';

// All logout tests live here so they can be wired to the dedicated
// `logout` Playwright project, which depends on `main`. This guarantees
// no logout test runs while another test still needs a valid Pulp
// session — POST /auth/logout/ flushes the real Django session during
// recording, which would otherwise pollute later tapes with 401s.

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

	test('session auth logout clears session', async ({ page }) => {
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
