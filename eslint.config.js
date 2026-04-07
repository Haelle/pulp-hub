import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			}
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser
			}
		}
	},
	{
		// SPA statique — pas de SSR, resolve() non applicable
		files: ['src/**/*.svelte', 'src/**/*.svelte.ts', 'src/**/*.ts'],
		rules: {
			'svelte/no-navigation-without-resolve': 'off'
		}
	},
	{
		// CJS files (e2e talkback server)
		files: ['**/*.cjs'],
		rules: {
			'@typescript-eslint/no-require-imports': 'off',
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
		}
	},
	{
		// Global declarations
		files: ['src/app.d.ts'],
		rules: {
			'@typescript-eslint/no-unused-vars': 'off'
		}
	},
	{
		ignores: [
			'build/',
			'.svelte-kit/',
			'node_modules/',
			'e2e/tapes/',
			'test-results/',
			'playwright-report/'
		]
	}
);
