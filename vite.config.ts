import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';
import { execSync } from 'child_process';

function getVersion(): string {
	if (process.env.APP_VERSION) return process.env.APP_VERSION;
	try {
		return execSync('git describe --tags --exact-match 2>/dev/null || git rev-parse --short HEAD')
			.toString()
			.trim();
	} catch {
		return 'dev';
	}
}

// Serves /config.js dynamically in dev, mirroring the prod entrypoint that
// renders it from PULP_URL via envsubst. Re-read on every request so a
// restart of the dev server is enough to pick up a new value.
function pulpUrlConfigPlugin(): Plugin {
	return {
		name: 'pulphub-config',
		configureServer(server) {
			server.middlewares.use('/config.js', (_req, res) => {
				const url = process.env.PULP_URL ?? '';
				res.setHeader('Content-Type', 'application/javascript');
				res.setHeader('Cache-Control', 'no-store');
				res.end(`window.__PULPHUB__ = { PULP_URL: ${JSON.stringify(url)} };\n`);
			});
		}
	};
}

export default defineConfig({
	plugins: [tailwindcss(), pulpUrlConfigPlugin(), sveltekit()],
	define: {
		__APP_VERSION__: JSON.stringify(getVersion())
	}
});
