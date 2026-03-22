import { test, expect } from '@playwright/test';
import { login } from './helpers/login';
import { testListPage } from './helpers/shared-list-tests';

test.describe('Users page', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	testListPage({
		route: '/users',
		navLabel: 'Users',
		title: 'Users',
		itemSelector: 'table tbody tr',
		filterText: 'captain',
		detailUrlPattern: /\/users/,
		hasCliHint: true
	});

	// Users-specific tests
	test('user row shows username', async ({ page }) => {
		await page.goto('/users');
		await expect(page.locator('table tbody').getByText('admin')).toBeVisible();
	});

	test('shows staff badge for admin', async ({ page }) => {
		await page.goto('/users');
		await expect(page.getByText('Staff').first()).toBeVisible();
	});
});
