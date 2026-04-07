import { test, expect } from '@playwright/test';
import { login } from './helpers/login';
import { testListPage, testDetailPage } from './helpers/shared-list-tests';

// Real task UUID extracted from e2e/tapes/GET_pulp_api_v3_tasks_*.json5
const TASK_UUID = '019d651d-bf09-7241-a619-a23d1768d302';

test.describe('Tasks list page', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	testListPage({
		route: '/tasks',
		title: 'Tasks & Workers',
		itemSelector: 'tbody tr',
		filterText: 'orphan',
		detailUrlPattern: /\/tasks\//,
		hasCliHint: true
	});

	test('state filter buttons are visible', async ({ page }) => {
		await page.goto('/tasks');
		for (const label of ['All', 'running', 'waiting', 'completed', 'failed', 'canceled']) {
			await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible();
		}
	});

	test('state filter updates table', async ({ page }) => {
		await page.goto('/tasks');
		await expect(page.locator('tbody tr').first()).toBeVisible();
		await page.getByRole('button', { name: 'completed', exact: true }).click();
		const stateBadges = page.locator('tbody tr td:nth-child(2)');
		await expect(stateBadges.first()).toBeVisible();
		const count = await stateBadges.count();
		for (let i = 0; i < count; i++) {
			await expect(stateBadges.nth(i)).toContainText('completed');
		}
	});

	test('task row has 5 columns and links to detail', async ({ page }) => {
		await page.goto('/tasks');
		const firstRow = page.locator('tbody tr').first();
		await expect(firstRow).toBeVisible();
		await expect(firstRow.locator('td')).toHaveCount(5);
		await expect(firstRow.locator('a[href^="/tasks/"]')).toBeVisible();
		await expect(firstRow.locator('td:nth-child(2)').locator('[data-slot="badge"]')).toBeVisible();
	});

	test('clicking a task navigates to its detail page', async ({ page }) => {
		await page.goto('/tasks');
		await page.locator('tbody tr a[href^="/tasks/"]').first().click();
		await expect(page).toHaveURL(/\/tasks\/[a-f0-9-]+/);
		await expect(page.locator('h1')).toBeVisible();
	});
});

test.describe('Workers tab', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await page.goto('/tasks');
		await page.getByRole('button', { name: 'Workers', exact: true }).click();
	});

	test('shows the workers table', async ({ page }) => {
		await expect(page.locator('table')).toBeVisible();
		await expect(page.locator('tbody tr').first()).toBeVisible();
	});

	test('worker row has a name and a status badge', async ({ page }) => {
		const firstRow = page.locator('tbody tr').first();
		await expect(firstRow).toBeVisible();
		await expect(firstRow.locator('[data-slot="badge"]')).toBeVisible();
		await expect(firstRow.locator('[data-slot="badge"]')).toContainText(/Online|Offline/);
	});

	test('shows the workers cli hint', async ({ page }) => {
		await expect(page.locator('[data-slot="alert-title"]')).toContainText('pulp-cli');
		await expect(page.locator('[data-slot="alert-description"]')).toContainText('pulp worker list');
	});
});

test.describe('Task detail page', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	testDetailPage({
		listRoute: '/tasks',
		directRoute: `/tasks/${TASK_UUID}`,
		itemSelector: 'tbody tr a',
		detailUrlPattern: /\/tasks\//,
		notFoundRoute: '/tasks/00000000-0000-0000-0000-000000000000',
		hasCliHint: true
	});

	test('displays the state badge', async ({ page }) => {
		await page.goto(`/tasks/${TASK_UUID}`);
		const badge = page.locator('h1').locator('..').locator('[data-slot="badge"]');
		await expect(badge).toBeVisible();
	});

	test('displays the timing card', async ({ page }) => {
		await page.goto(`/tasks/${TASK_UUID}`);
		const timingCard = page.getByText('Timing').locator('..').locator('..');
		await expect(timingCard).toBeVisible();
		for (const label of ['Created', 'Started', 'Finished', 'Duration']) {
			await expect(timingCard.getByText(label, { exact: true })).toBeVisible();
		}
	});

	test('cli hint mentions pulp task show', async ({ page }) => {
		await page.goto(`/tasks/${TASK_UUID}`);
		await expect(page.locator('[data-slot="alert-description"]')).toContainText('pulp task show');
	});

	test('shows back to tasks link', async ({ page }) => {
		await page.goto(`/tasks/${TASK_UUID}`);
		const back = page.getByRole('link', { name: /back to tasks/i });
		await expect(back).toBeVisible();
		await back.click();
		await expect(page).toHaveURL('/tasks');
	});
});
