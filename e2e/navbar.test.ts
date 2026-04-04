import { test, expect } from '@playwright/test';
import { login, loginBasicAuth, PULP_URL, PULP_USER, PULP_PASS } from './helpers/login';

const REPO_TRIGGER = /^(Repositories|Images|Files|npm|PyPI)$/;
const ADMIN_TRIGGER = /^(Admin|Status|Tasks|Users)$/;

test.describe('Navbar', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('displays app version', async ({ page }) => {
		const navbar = page.locator('nav');
		const version = navbar.locator('span', { hasText: /^[a-f0-9]{7,}$|^\d+\.\d+|^dev$/ });
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

	test('displays Session badge and popover', async ({ page }) => {
		const navbar = page.locator('nav');
		const badge = navbar.locator('[data-testid="auth-badge"]');
		await expect(badge).toBeVisible();
		await expect(badge).toContainText('admin');
		await expect(badge).toContainText('Session');

		await navbar.locator('[data-testid="auth-help"]').click();
		const popover = page.locator('[data-testid="auth-popover"]');
		await expect(popover).toBeVisible();
		await expect(popover).toContainText('Session');
	});

	test('closes security popover when clicking elsewhere', async ({ page }) => {
		const navbar = page.locator('nav');
		const helpButton = navbar.locator('[data-testid="auth-help"]');
		await helpButton.click();

		const popover = page.locator('[data-testid="auth-popover"]');
		await expect(popover).toBeVisible();

		await page.locator('body').click({ position: { x: 0, y: 0 } });
		await expect(popover).not.toBeVisible();
	});
});

test.describe('Navbar (Basic Auth)', () => {
	test('displays Basic Auth badge when forced', async ({ page }) => {
		await loginBasicAuth(page);
		const navbar = page.locator('nav');
		const badge = navbar.locator('[data-testid="auth-badge"]');
		await expect(badge).toBeVisible();
		await expect(badge).toContainText('admin');
		await expect(badge).toContainText('Basic Auth');
	});
});

test.describe('Navbar (Session Auth)', () => {
	test('displays Session badge and popover', async ({ page }) => {
		await page.goto('/');
		await page.fill('input[name="url"]', PULP_URL);
		await page.fill('input[name="username"]', PULP_USER);
		await page.fill('input[name="password"]', PULP_PASS);
		await page.click('button[type="submit"]');
		await expect(page).toHaveURL('/images');

		const navbar = page.locator('nav');
		const badge = navbar.locator('[data-testid="auth-badge"]');
		await expect(badge).toBeVisible();
		await expect(badge).toContainText('admin');
		await expect(badge).toContainText('Session');

		await navbar.locator('[data-testid="auth-help"]').click();
		const popover = page.locator('[data-testid="auth-popover"]');
		await expect(popover).toBeVisible();
		await expect(popover).toContainText('Session Auth');
	});
});
