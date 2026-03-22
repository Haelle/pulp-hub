import type {
	FullConfig,
	FullResult,
	Reporter,
	Suite,
	TestCase,
	TestResult
} from '@playwright/test/reporter';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

interface TestEntry {
	title: string;
	titlePath: string[];
	status: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';
	duration: number;
	errors: string[];
}

class RSpecReporter implements Reporter {
	private results: TestEntry[] = [];
	private startTime = 0;

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	onBegin(_config: FullConfig, _suite: Suite) {
		this.startTime = Date.now();
	}

	onTestEnd(test: TestCase, result: TestResult) {
		// Show progress dots
		const dot =
			result.status === 'passed'
				? `${GREEN}.${RESET}`
				: result.status === 'skipped'
					? `${YELLOW}*${RESET}`
					: `${RED}F${RESET}`;
		process.stdout.write(dot);

		const isShared = test.location.file.includes('helpers/');
		this.results.push({
			title: isShared ? `[Shared] ${test.title}` : test.title,
			titlePath: test.titlePath().filter((s) => s.length > 0),
			status: result.status,
			duration: result.duration,
			errors: result.errors.map((e) => e.message ?? e.toString())
		});
	}

	onEnd(result: FullResult) {
		const totalDuration = Date.now() - this.startTime;
		const passed = this.results.filter((r) => r.status === 'passed').length;
		const failed = this.results.filter(
			(r) => r.status === 'failed' || r.status === 'timedOut'
		).length;
		const skipped = this.results.filter((r) => r.status === 'skipped').length;

		// Blank line after dots
		console.log('\n');

		// Group by describe path
		this.printTree(this.results);

		// Failures detail
		const failures = this.results.filter((r) => r.status === 'failed' || r.status === 'timedOut');
		if (failures.length > 0) {
			console.log(`\n${RED}${BOLD}Failures:${RESET}\n`);
			for (const f of failures) {
				console.log(`  ${RED}${f.titlePath.join(' › ')}${RESET}`);
				for (const err of f.errors) {
					const lines = err.split('\n').slice(0, 6);
					for (const line of lines) {
						console.log(`    ${DIM}${line}${RESET}`);
					}
				}
				console.log();
			}
		}

		// Summary
		const parts: string[] = [];
		parts.push(`${BOLD}${passed} passed${RESET}`);
		if (failed > 0) parts.push(`${RED}${BOLD}${failed} failed${RESET}`);
		if (skipped > 0) parts.push(`${YELLOW}${skipped} skipped${RESET}`);
		const duration =
			totalDuration > 60000
				? `${(totalDuration / 60000).toFixed(1)}m`
				: `${(totalDuration / 1000).toFixed(1)}s`;

		console.log(
			`${BOLD}${this.results.length} tests${RESET}, ${parts.join(', ')} ${DIM}(${duration})${RESET}`
		);

		if (result.status !== 'passed') {
			process.exitCode = 1;
		}
	}

	private printTree(entries: TestEntry[]) {
		// Build tree structure
		const tree = new Map<string, TestEntry[] | Map<string, TestEntry[]>>();

		for (const entry of entries) {
			// titlePath: ["", "chromium", "describe", "test"] or deeper
			// Skip empty and browser name
			const path = entry.titlePath.slice(2); // remove "" and "chromium"
			if (path.length === 0) continue;

			const group = path.slice(0, -1).join(' › ') || '(root)';
			if (!tree.has(group)) {
				tree.set(group, []);
			}
			(tree.get(group) as TestEntry[]).push(entry);
		}

		for (const [group, tests] of tree) {
			console.log(`${BOLD}${group}${RESET}`);
			for (const t of tests as TestEntry[]) {
				const icon =
					t.status === 'passed'
						? `${GREEN}✓${RESET}`
						: t.status === 'skipped'
							? `${YELLOW}○${RESET}`
							: `${RED}✗${RESET}`;
				const duration = `${DIM}(${(t.duration / 1000).toFixed(1)}s)${RESET}`;
				const titleColor = t.status === 'failed' || t.status === 'timedOut' ? RED : '';
				console.log(`  ${icon} ${titleColor}${t.title}${RESET} ${duration}`);
			}
			console.log();
		}
	}
}

export default RSpecReporter;
