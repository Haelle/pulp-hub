import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: 'e2e',
	webServer: {
		command: 'NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev',
		url: 'http://localhost:5173',
		reuseExistingServer: true,
		timeout: 15000
	},
	use: {
		baseURL: 'http://localhost:5173',
		launchOptions: {
			slowMo: parseInt(process.env.SLOWMO ?? '0')
		}
	},
	projects: [
		{
			name: 'chromium',
			use: { browserName: 'chromium' }
		}
	]
});
