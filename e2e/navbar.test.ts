import { test, expect } from '@playwright/test';
import { login } from './helpers/login';

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
