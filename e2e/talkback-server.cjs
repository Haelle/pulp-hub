const http = require('http');
const talkback = require('talkback');
const path = require('path');

const PULP_HOST = process.env.PULP_HOST ?? 'http://localhost:8081';
const TALKBACK_PORT = parseInt(process.env.TALKBACK_PORT ?? '8787');
const RECORD_MODE = process.env.TALKBACK_RECORD ?? 'NEW';

const CORS_HEADERS = {
	'access-control-allow-origin': '*',
	'access-control-allow-headers': 'Authorization, Content-Type',
	'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

const talkbackServer = talkback({
	host: PULP_HOST,
	port: TALKBACK_PORT + 1, // internal port, not exposed
	path: path.join(__dirname, 'tapes'),
	record: talkback.Options.RecordMode[RECORD_MODE],
	ignoreHeaders: ['content-length', 'host', 'authorization', 'cookie'],
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
	},
	responseDecorator: (tape, req) => {
		if (!tape.res.headers) tape.res.headers = {};
		Object.assign(tape.res.headers, CORS_HEADERS);
		return tape;
	}
});

// Wrap with a CORS proxy to handle preflight and fallback responses
const proxy = http.createServer((req, res) => {
	// Handle CORS preflight
	if (req.method === 'OPTIONS') {
		res.writeHead(204, CORS_HEADERS);
		res.end();
		return;
	}

	// Forward to talkback, then add CORS headers to the response
	const options = {
		hostname: 'localhost',
		port: TALKBACK_PORT + 1,
		path: req.url,
		method: req.method,
		headers: req.headers
	};

	const proxyReq = http.request(options, (proxyRes) => {
		const headers = { ...proxyRes.headers, ...CORS_HEADERS };
		res.writeHead(proxyRes.statusCode, headers);
		proxyRes.pipe(res);
	});

	proxyReq.on('error', (err) => {
		res.writeHead(502, CORS_HEADERS);
		res.end(JSON.stringify({ error: err.message }));
	});

	req.pipe(proxyReq);
});

talkbackServer.start(() => {
	proxy.listen(TALKBACK_PORT, () => {
		console.log(
			`Talkback CORS proxy on http://localhost:${TALKBACK_PORT} → talkback:${TALKBACK_PORT + 1} → ${PULP_HOST} [mode: ${RECORD_MODE}]`
		);
	});
});
