const http = require('http');
const talkback = require('talkback');
const path = require('path');

const PULP_HOST = process.env.PULP_HOST ?? 'http://host.docker.internal:8081';
const TALKBACK_PORT = parseInt(process.env.TALKBACK_PORT ?? '8787');
const RECORD_MODE = process.env.TALKBACK_RECORD ?? 'NEW';

// Dynamic CORS headers — support credentials by echoing the request origin
function corsHeaders(req) {
	const origin = (req && req.headers && req.headers.origin) || '*';
	return {
		'access-control-allow-origin': origin,
		'access-control-allow-headers': 'Authorization, Content-Type, X-CSRFToken',
		'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
		'access-control-allow-credentials': 'true'
	};
}

// Static fallback for talkback tape decorator (no request context)
const CORS_HEADERS_STATIC = {
	'access-control-allow-origin': '*',
	'access-control-allow-headers': 'Authorization, Content-Type, X-CSRFToken',
	'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

const MOCK_CSRF_TOKEN = 'talkback-csrf-token-for-testing';
const MOCK_SESSION_ID = 'talkback-session-id-for-testing';

/**
 * Handle session auth endpoints locally (no talkback tape needed).
 * Returns true if the request was handled.
 */
function handleSessionAuth(req, res) {
	const url = new URL(req.url, `http://localhost:${TALKBACK_PORT}`);
	const cors = corsHeaders(req);

	// GET /auth/login/ — return CSRF cookie
	if (url.pathname === '/auth/login/' && req.method === 'GET') {
		res.writeHead(200, {
			...cors,
			'content-type': 'text/html; charset=utf-8',
			'set-cookie': `csrftoken=${MOCK_CSRF_TOKEN}; Path=/; SameSite=None; Secure`
		});
		res.end('<html><body>Login page</body></html>');
		return true;
	}

	// POST /auth/login/ — validate credentials, return session cookie
	if (url.pathname === '/auth/login/' && req.method === 'POST') {
		let body = '';
		req.on('data', (chunk) => (body += chunk));
		req.on('end', () => {
			const params = new URLSearchParams(body);
			const username = params.get('username');
			const password = params.get('password');

			if (username === 'admin' && password === 'admin') {
				res.writeHead(302, {
					...cors,
					location: '/accounts/profile/',
					'set-cookie': [
						`csrftoken=${MOCK_CSRF_TOKEN}; Path=/; SameSite=None; Secure`,
						`sessionid=${MOCK_SESSION_ID}; Path=/; HttpOnly; SameSite=None; Secure`
					]
				});
				res.end();
			} else {
				res.writeHead(200, {
					...cors,
					'content-type': 'text/html; charset=utf-8',
					'set-cookie': `csrftoken=${MOCK_CSRF_TOKEN}; Path=/; SameSite=None; Secure`
				});
				res.end('<html><body>Invalid credentials</body></html>');
			}
		});
		return true;
	}

	// POST /auth/logout/ — clear session cookie
	if (url.pathname === '/auth/logout/' && req.method === 'POST') {
		res.writeHead(302, {
			...cors,
			location: '/',
			'set-cookie': 'sessionid=""; expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Path=/; SameSite=None; Secure'
		});
		res.end();
		return true;
	}

	return false;
}

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
	responseDecorator: (tape, _req) => {
		if (!tape.res.headers) tape.res.headers = {};
		Object.assign(tape.res.headers, CORS_HEADERS_STATIC);
		return tape;
	}
});

// Wrap with a CORS proxy to handle preflight and fallback responses
const proxy = http.createServer((req, res) => {
	const cors = corsHeaders(req);

	// Handle CORS preflight
	if (req.method === 'OPTIONS') {
		res.writeHead(204, cors);
		res.end();
		return;
	}

	// Handle session auth endpoints locally
	if (handleSessionAuth(req, res)) return;

	// Forward to talkback, then add CORS headers to the response
	const options = {
		hostname: 'localhost',
		port: TALKBACK_PORT + 1,
		path: req.url,
		method: req.method,
		headers: req.headers
	};

	const proxyReq = http.request(options, (proxyRes) => {
		const headers = { ...proxyRes.headers, ...cors };
		res.writeHead(proxyRes.statusCode, headers);
		proxyRes.pipe(res);
	});

	proxyReq.on('error', (err) => {
		res.writeHead(502, cors);
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
