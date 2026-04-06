import { defineConfig } from '@playwright/test';

const TALKBACK_PORT = parseInt(process.env.TALKBACK_PORT ?? '8787');

export default defineConfig({
	testDir: 'e2e',
	timeout: 15000,
	fullyParallel: true,
	reporter: [['./e2e/reporters/structured-reporter.ts']],
	webServer: [
		{
			command: `node e2e/talkback-server.cjs`,
			port: TALKBACK_PORT,
			reuseExistingServer: true,
			timeout: 5000,
			env: {}
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
			name: 'main',
			use: { browserName: 'chromium' },
			testIgnore: ['**/logout.test.ts']
		},
		{
			// Logout tests run after `main` so POST /auth/logout/ never
			// flushes a session that another test still needs (during
			// recording). See e2e/logout.test.ts.
			name: 'logout',
			use: { browserName: 'chromium' },
			testMatch: ['**/logout.test.ts'],
			dependencies: ['main']
		}
	]
});
