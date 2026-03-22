import { test } from '@playwright/test';
import { login } from './helpers/login';
import { testListPage } from './helpers/shared-list-tests';

test.describe('Images page', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	testListPage({
		route: '/images',
		navLabel: 'Images',
		title: 'Images',
		filterText: 'alpine',
		detailUrlPattern: /\/images\//,
		hasCliHint: true,
		hasSourceFilter: true
	});
});
