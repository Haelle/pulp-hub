import { test, expect } from '@playwright/test';
import { login } from './helpers/login';

const REPO_TRIGGER = /^(Repositories|Images|Files|npm|PyPI)$/;
const ADMIN_TRIGGER = /^(Admin|Status|Tasks|Users)$/;

test.describe('Navbar', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('displays app version', async ({ page }) => {
		const navbar = page.locator('nav');
		const version = navbar.locator('span', { hasText: /^[a-f0-9]{7,}$|^v\d+|^dev$/ });
		await expect(version).toBeVisible();
	});

	test('Repositories dropdown contains all repo links', async ({ page }) => {
		await page.getByRole('button', { name: REPO_TRIGGER }).click();
		for (const label of ['Images', 'Files', 'npm', 'PyPI']) {
			await expect(page.getByRole('menuitem', { name: label, exact: true })).toBeVisible();
		}
	});

	test('Admin dropdown contains Status, Tasks and Users', async ({ page }) => {
		await page.getByRole('button', { name: ADMIN_TRIGGER }).click();
		for (const label of ['Status', 'Tasks', 'Users']) {
			await expect(page.getByRole('menuitem', { name: label, exact: true })).toBeVisible();
		}
	});

	test('Pull-through link is visible', async ({ page }) => {
		await expect(page.getByRole('link', { name: 'Pull-through', exact: true })).toBeVisible();
	});

	test('navigate to /files via Repositories dropdown', async ({ page }) => {
		await page.getByRole('button', { name: REPO_TRIGGER }).click();
		await page.getByRole('menuitem', { name: 'Files', exact: true }).click();
		await expect(page).toHaveURL('/files');
	});

	test('navigate to /users via Admin dropdown', async ({ page }) => {
		await page.getByRole('button', { name: ADMIN_TRIGGER }).click();
		await page.getByRole('menuitem', { name: 'Users', exact: true }).click();
		await expect(page).toHaveURL('/users');
	});

	test('navigate to /pull-through via direct link', async ({ page }) => {
		await page.getByRole('link', { name: 'Pull-through', exact: true }).click();
		await expect(page).toHaveURL('/pull-through');
	});
});
