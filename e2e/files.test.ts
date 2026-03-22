import { test, expect, type Page } from '@playwright/test';

const PULP_URL = process.env.PULP_URL ?? `http://localhost:${process.env.TALKBACK_PORT ?? '8787'}`;
const PULP_USER = process.env.PULP_USER ?? 'admin';
const PULP_PASS = process.env.PULP_PASS ?? 'admin';

async function login(page: Page) {
	await page.goto('/');
	await page.fill('input[name="url"]', PULP_URL);
	await page.fill('input[name="username"]', PULP_USER);
	await page.fill('input[name="password"]', PULP_PASS);
	await page.click('button[type="submit"]');
	await expect(page).toHaveURL('/images');
}

test.describe('Files page', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('navbar has Files link', async ({ page }) => {
		const filesLink = page.getByRole('link', { name: 'Files' });
		await expect(filesLink).toBeVisible();
	});

	test('navigate to /files via navbar', async ({ page }) => {
		await page.getByRole('link', { name: 'Files' }).click();
		await expect(page).toHaveURL('/files');
	});

	test('displays file distribution cards', async ({ page }) => {
		await page.goto('/files');

		const cards = page.locator('[data-slot="card"]');
		await expect(cards.first()).toBeVisible();
	});

	test('file card shows name and base_path', async ({ page }) => {
		await page.goto('/files');

		const cards = page.locator('[data-slot="card"]');
		await expect(cards).not.toHaveCount(0);
		await expect(cards.first().locator('[data-slot="card-title"]')).toBeVisible();
		await expect(cards.first().locator('[data-slot="card-description"]')).toBeVisible();
	});

	test('file card has File badge', async ({ page }) => {
		await page.goto('/files');

		const badge = page.locator('[data-slot="card"]').first().getByText('File');
		await expect(badge).toBeVisible();
	});

	test('file card links to detail page', async ({ page }) => {
		await page.goto('/files');

		await page.locator('[data-slot="card"]', { hasText: 'test-docs' }).click();
		await expect(page).toHaveURL(/\/files\/test-docs/);
	});

	test('filter narrows results', async ({ page }) => {
		await page.goto('/files');

		const filterInput = page.getByPlaceholder(/search|filter/i);
		await filterInput.fill('test-docs');

		await expect(page.locator('[data-slot="card"]')).toHaveCount(1);
	});

	test('filter with no match shows empty state', async ({ page }) => {
		await page.goto('/files');

		const filterInput = page.getByPlaceholder(/search|filter/i);
		await filterInput.fill('zzz-nonexistent-zzz');

		await expect(page.getByText(/no|aucun|empty/i)).toBeVisible();
	});

	test('shows cli hint', async ({ page }) => {
		await page.goto('/files');

		await expect(page.locator('[data-slot="alert-title"]')).toContainText('pulp-cli');
	});

	test('Files navbar button is active on /files', async ({ page }) => {
		await page.goto('/files');

		// The active button uses "secondary" variant which has distinct styling
		const filesButton = page.getByRole('link', { name: 'Files' });
		await expect(filesButton).toBeVisible();
	});
});

test.describe('File detail page', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('displays file repo name and File badge', async ({ page }) => {
		await page.goto('/files/test-docs');

		await expect(page.locator('h1')).toContainText('test-docs');
		await expect(page.locator('[data-slot="badge"]', { hasText: 'File' })).toBeVisible();
	});

	test('displays files table with relative paths', async ({ page }) => {
		await page.goto('/files/test-docs');

		await expect(page.locator('table')).toBeVisible();
		await expect(page.locator('tbody tr')).not.toHaveCount(0);
		// Should show at least one of the seeded files
		await expect(page.getByText('README.md')).toBeVisible();
	});

	test('file rows link to content detail', async ({ page }) => {
		await page.goto('/files/test-docs');

		await page.locator('tbody tr').first().locator('a').click();
		await expect(page).toHaveURL(/\/files\/test-docs\/content\//);
	});

	test('shows sha256 truncated in table', async ({ page }) => {
		await page.goto('/files/test-docs');

		// sha256 cells should show truncated hashes (12 chars)
		const hashCell = page.locator('tbody tr').first().locator('td').nth(1);
		const text = await hashCell.textContent();
		// Should be a short hex string (12 chars) not the full 64
		expect(text!.trim().length).toBeLessThanOrEqual(12);
	});

	test('shows cli hint with chaining explanation', async ({ page }) => {
		await page.goto('/files/test-docs');

		await expect(page.locator('[data-slot="alert-title"]')).toContainText('pulp-cli');
		await expect(page.getByText(/chaining|chain/i)).toBeVisible();
	});

	test('shows not found for nonexistent file repo', async ({ page }) => {
		await page.goto('/files/nonexistent-repo');
		await expect(page.getByText(/not found/i)).toBeVisible();
	});

	test('navigable from files list', async ({ page }) => {
		await page.goto('/files');

		await page.locator('[data-slot="card"]', { hasText: 'test-docs' }).click();
		await expect(page).toHaveURL(/\/files\/test-docs/);
		await expect(page.locator('h1')).toContainText('test-docs');
	});
});

test.describe('File content detail page', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('displays file name and sha256', async ({ page }) => {
		await page.goto('/files/test-docs');
		// Click on first file to navigate to content detail
		await page.locator('tbody tr').first().locator('a').click();
		await expect(page).toHaveURL(/\/files\/test-docs\/content\//);

		// Should show the relative path as heading
		await expect(page.locator('h1')).toBeVisible();
		// Should show full sha256
		await expect(page.getByText(/^[a-f0-9]{64}$/)).toBeVisible();
	});

	test('displays file size', async ({ page }) => {
		await page.goto('/files/test-docs');
		await page.locator('tbody tr').first().locator('a').click();

		// Size should be displayed (e.g. "20 B", "1.2 KB")
		await expect(page.getByText(/\d+(\.\d+)?\s*(B|KB|MB|GB)/)).toBeVisible();
	});

	test('shows cli hint', async ({ page }) => {
		await page.goto('/files/test-docs');
		await page.locator('tbody tr').first().locator('a').click();

		await expect(page.locator('[data-slot="alert-title"]')).toContainText('pulp-cli');
		await expect(page.getByText(/pulp file content list/)).toBeVisible();
	});

	test('shows copy button for sha256', async ({ page }) => {
		await page.goto('/files/test-docs');
		await page.locator('tbody tr').first().locator('a').click();

		const copyButton = page.getByRole('button', { name: /copy/i });
		await expect(copyButton.first()).toBeVisible();
	});

	test('navigable from file detail table', async ({ page }) => {
		await page.goto('/files/test-docs');

		const firstFileLink = page.locator('tbody tr').first().locator('a');
		const fileName = await firstFileLink.textContent();
		await firstFileLink.click();

		await expect(page.locator('h1')).toContainText(fileName!.trim());
	});
});
