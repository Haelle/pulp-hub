import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
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

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	define: {
		__APP_VERSION__: JSON.stringify(getVersion())
	}
});
