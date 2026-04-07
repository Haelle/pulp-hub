import { expect, type Page } from '@playwright/test';

export const PULP_URL =
	process.env.PULP_URL ?? `http://localhost:${process.env.TALKBACK_PORT ?? '8787'}`;
export const PULP_USER = process.env.PULP_USER ?? 'admin';
export const PULP_PASS = process.env.PULP_PASS ?? 'admin';

export async function login(page: Page) {
	await page.goto('/');
	await page.fill('input[name="username"]', PULP_USER);
	await page.fill('input[name="password"]', PULP_PASS);
	await page.click('button[type="submit"]');
	await expect(page).toHaveURL('/images');
}

export async function loginBasicAuth(page: Page) {
	await page.goto('/');
	await page.fill('input[name="username"]', PULP_USER);
	await page.fill('input[name="password"]', PULP_PASS);
	await page.check('[data-testid="force-basic-auth"]');
	await page.click('button[type="submit"]');
	await expect(page).toHaveURL('/images');
}
