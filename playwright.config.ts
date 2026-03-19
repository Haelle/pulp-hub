import { defineConfig } from '@playwright/test';

const TALKBACK_PORT = parseInt(process.env.TALKBACK_PORT ?? '8787');

export default defineConfig({
	testDir: 'e2e',
	webServer: [
		{
			command: `node e2e/talkback-server.cjs`,
			port: TALKBACK_PORT,
			reuseExistingServer: true,
			timeout: 5000,
			env: {
				TALKBACK_RECORD: process.env.TALKBACK_RECORD ?? 'NEW'
			}
		},
		{
			command: 'npm run dev',
			url: 'http://localhost:5173',
			reuseExistingServer: true,
			timeout: 15000
		}
	],
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
