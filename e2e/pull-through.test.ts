import { test, expect } from '@playwright/test';
import { login } from './helpers/login';
import { testListPage, testDetailPage } from './helpers/shared-list-tests';

test.describe('Pull-through list page', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	testListPage({
		route: '/pull-through',
		navLabel: 'Pull-through',
		title: 'Pull-through',
		filterText: 'docker',
		detailUrlPattern: /\/pull-through\//,
		hasCliHint: true
	});
});

test.describe('Pull-through detail page', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	testDetailPage({
		listRoute: '/pull-through',
		directRoute: '/pull-through/dockerhub-cache',
		detailUrlPattern: /\/pull-through\//,
		notFoundRoute: '/pull-through/nonexistent-cache',
		hasCliHint: true
	});

	test('displays name and type badge', async ({ page }) => {
		await page.goto('/pull-through');
		await page.locator('[data-slot="card"]').first().click();
		await expect(page).toHaveURL(/\/pull-through\//);
		await expect(page.locator('h1 + [data-slot="badge"]')).toBeVisible();
	});

	test('shows upstream URL', async ({ page }) => {
		await page.goto('/pull-through');
		await page.locator('[data-slot="card"]').first().click();
		await expect(page).toHaveURL(/\/pull-through\//);
		await expect(page.getByText(/https?:\/\//).first()).toBeVisible();
	});

	test('shows copyable usage command', async ({ page }) => {
		await page.goto('/pull-through');
		await page.locator('[data-slot="card"]').first().click();
		await expect(page.getByRole('button', { name: /copy/i }).first()).toBeVisible();
	});

	test('container detail shows podman/docker pull command', async ({ page }) => {
		await page.goto('/pull-through');
		const containerCard = page.locator('[data-slot="card"]', { hasText: 'Container' }).first();
		if ((await containerCard.count()) > 0) {
			await containerCard.click();
			await expect(page.getByText(/podman pull/)).toBeVisible();
			await expect(page.getByText(/docker pull/)).toBeVisible();
		}
	});

	test('container detail shows registry mirror config', async ({ page }) => {
		await page.goto('/pull-through');
		const containerCard = page.locator('[data-slot="card"]', { hasText: 'Container' }).first();
		if ((await containerCard.count()) > 0) {
			await containerCard.click();
			await expect(page.getByText(/daemon\.json|registries\.conf/).first()).toBeVisible();
		}
	});

	test('python detail shows pip and uv config', async ({ page }) => {
		await page.goto('/pull-through');
		const pypiCard = page.locator('[data-slot="card"]', { hasText: 'PyPI' }).first();
		if ((await pypiCard.count()) > 0) {
			await pypiCard.click();
			await expect(page.getByText(/pip install/)).toBeVisible();
			await expect(page.getByText(/uv/)).toBeVisible();
			await expect(page.getByText(/pyproject\.toml/)).toBeVisible();
		}
	});

	test('npm detail shows npm and pnpm config', async ({ page }) => {
		await page.goto('/pull-through');
		const npmCard = page.locator('[data-slot="card"]', { hasText: /^npm$/ }).first();
		if ((await npmCard.count()) > 0) {
			await npmCard.click();
			await expect(page.getByText(/npm install/)).toBeVisible();
			await expect(page.getByText(/\.npmrc/)).toBeVisible();
		}
	});
});
