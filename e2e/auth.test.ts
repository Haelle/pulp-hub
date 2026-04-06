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
