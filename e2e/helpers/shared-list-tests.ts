import { test, expect } from '@playwright/test';

export interface ListPageConfig {
	route: string;
	title: string;
	itemSelector?: string;
	filterText: string;
	emptyText?: string | RegExp;
	detailUrlPattern: RegExp;
	hasCliHint?: boolean;
	hasSourceFilter?: boolean;
}

/**
 * Shared tests for list pages (images, files, npm, pull-through, users).
 * Call inside a test.describe() block that already has a beforeEach with login.
 */
export function testListPage(config: ListPageConfig) {
	const {
		route,
		title,
		itemSelector = '[data-slot="card"]',
		filterText,
		emptyText = /no.*found/i,
		hasCliHint = true,
		hasSourceFilter = false
	} = config;

	test('displays page title', async ({ page }) => {
		await page.goto(route);
		await expect(page.locator('h1')).toContainText(title);
	});

	if (hasCliHint) {
		test('shows cli hint', async ({ page }) => {
			await page.goto(route);
			await expect(page.locator('[data-slot="alert-title"]')).toContainText('pulp-cli');
		});
	}

	test('displays items', async ({ page }) => {
		await page.goto(route);
		const items = page.locator(itemSelector);
		await expect(items.first()).toBeVisible();
	});

	test('item shows title and description/badge', async ({ page }) => {
		await page.goto(route);
		const item = page.locator(itemSelector).first();
		await expect(item).toBeVisible();
	});

	test('filter narrows results', async ({ page }) => {
		await page.goto(route);
		await expect(page.locator(itemSelector).first()).toBeVisible();
		const filterInput = page.getByPlaceholder(/search|filter/i);
		await filterInput.fill(filterText);
		await expect(page.locator(itemSelector).first()).toBeVisible();
	});

	test('filter with no match shows empty state', async ({ page }) => {
		await page.goto(route);
		await expect(page.locator(itemSelector).first()).toBeVisible();
		const filterInput = page.getByPlaceholder(/search|filter/i);
		await filterInput.fill('zzz-nonexistent-zzz');
		await expect(page.getByText(emptyText)).toBeVisible();
	});

	if (hasSourceFilter) {
		test('source filter checkboxes are visible', async ({ page }) => {
			await page.goto(route);
			await expect(page.locator(itemSelector).first()).toBeVisible();
			await expect(page.locator('input[type="checkbox"]').first()).toBeVisible();
		});
	}

	test('redirects to login if not authenticated', async ({ browser }) => {
		const context = await browser.newContext();
		const freshPage = await context.newPage();
		await freshPage.goto(route);
		await expect(freshPage).toHaveURL('/');
		await context.close();
	});
}

export interface DetailPageConfig {
	listRoute: string;
	directRoute: string;
	itemSelector?: string;
	detailUrlPattern: RegExp;
	notFoundRoute: string;
	hasCliHint?: boolean;
}

/**
 * Shared tests for detail pages.
 * Call inside a test.describe() block that already has a beforeEach with login.
 */
export function testDetailPage(config: DetailPageConfig) {
	const {
		listRoute,
		directRoute,
		itemSelector = '[data-slot="card"]',
		detailUrlPattern,
		notFoundRoute,
		hasCliHint = true
	} = config;

	test('navigable from list page', async ({ page }) => {
		await page.goto(listRoute);
		await page.locator(itemSelector).first().click();
		await expect(page).toHaveURL(detailUrlPattern);
		await expect(page.locator('h1')).toBeVisible();
	});

	test('displays title', async ({ page }) => {
		await page.goto(directRoute);
		await expect(page.locator('h1')).toBeVisible();
	});

	if (hasCliHint) {
		test('shows cli hint', async ({ page }) => {
			await page.goto(directRoute);
			await expect(page.locator('[data-slot="alert-title"]')).toContainText('pulp-cli');
		});
	}

	test('shows not found for nonexistent entry', async ({ page }) => {
		await page.goto(notFoundRoute);
		await expect(page.getByText(/not found/i)).toBeVisible();
	});
}
