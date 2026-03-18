const talkback = require('talkback');
const path = require('path');

const PULP_HOST = process.env.PULP_HOST ?? 'https://pulp.local:8443';
const TALKBACK_PORT = parseInt(process.env.TALKBACK_PORT ?? '8787');
const RECORD_MODE = process.env.TALKBACK_RECORD ?? 'NEW';

const server = talkback({
	host: PULP_HOST,
	port: TALKBACK_PORT,
	path: path.join(__dirname, 'tapes'),
	record: talkback.Options.RecordMode[RECORD_MODE],
	ignoreHeaders: ['content-length', 'host'],
	fallbackMode: talkback.Options.FallbackMode.NOT_FOUND,
	silent: false,
	summary: true,
	tapeNameGenerator: (tapeNumber, tape) => {
		const url = new URL(tape.req.url, `http://localhost:${TALKBACK_PORT}`);
		const pathname = url.pathname
			.replace(/^\//, '')
			.replace(/\//g, '_')
			.replace(/[^a-zA-Z0-9_-]/g, '');
		return `${tape.req.method}_${pathname}_${tapeNumber}`;
	}
});

server.start(() => {
	console.log(
		`Talkback proxy started on http://localhost:${TALKBACK_PORT} → ${PULP_HOST} [mode: ${RECORD_MODE}]`
	);
});
