const http = require('http');
const talkback = require('talkback');
const path = require('path');

const PULP_HOST = process.env.PULP_HOST ?? 'http://host.docker.internal:8081';
const TALKBACK_PORT = parseInt(process.env.TALKBACK_PORT ?? '8787');
const PULP_USER = process.env.PULP_USER ?? 'admin';
const PULP_PASS = process.env.PULP_PASS ?? 'admin';

const MOCK_CSRF = 'test-csrf';
const MOCK_SESSION = 'test-session';

// Basic Auth used when forwarding API requests to a real Pulp during
// recording. The mock /auth/* endpoints set a fake `sessionid` cookie that
// real Pulp would reject, so we authenticate forwarded requests via Basic
// Auth instead. In replay mode talkback never reaches Pulp, and during
// matching `authorization` is ignored — so this header is harmless.
const BASIC_AUTH = `Basic ${Buffer.from(`${PULP_USER}:${PULP_PASS}`).toString('base64')}`;

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

// Handle Pulp session-auth endpoints locally so they never hit a real Pulp
// and never end up in tapes. This decouples API tapes from session lifetime
// so adding a new test doesn't require re-recording the auth flow.
// Returns true if the request was handled.
function handleSessionAuth(req, res) {
	const url = new URL(req.url, `http://localhost:${TALKBACK_PORT}`);
	const cors = corsHeaders(req);

	if (url.pathname === '/auth/login/' && req.method === 'GET') {
		res.writeHead(200, {
			...cors,
			'content-type': 'text/html; charset=utf-8',
			'set-cookie': `csrftoken=${MOCK_CSRF}; Path=/; SameSite=Lax`
		});
		res.end('<html><body>Login page</body></html>');
		return true;
	}

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
						`csrftoken=${MOCK_CSRF}; Path=/; SameSite=Lax`,
						`sessionid=${MOCK_SESSION}; Path=/; HttpOnly; SameSite=Lax`
					]
				});
				res.end();
			} else {
				res.writeHead(200, {
					...cors,
					'content-type': 'text/html; charset=utf-8',
					'set-cookie': `csrftoken=${MOCK_CSRF}; Path=/; SameSite=Lax`
				});
				res.end('<html><body>Invalid credentials</body></html>');
			}
		});
		return true;
	}

	if (url.pathname === '/auth/logout/' && req.method === 'POST') {
		res.writeHead(302, {
			...cors,
			location: '/',
			'set-cookie':
				'sessionid=""; expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Path=/; SameSite=Lax'
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
	ignoreHeaders: ['content-length', 'host', 'cookie', 'x-csrftoken', 'authorization'],
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

// Wrap with a CORS proxy to handle preflight and fallback responses
const proxy = http.createServer((req, res) => {
	const cors = corsHeaders(req);

	// Handle CORS preflight
	if (req.method === 'OPTIONS') {
		res.writeHead(204, cors);
		res.end();
		return;
	}

	// Short-circuit /auth/* endpoints with deterministic mocks
	if (handleSessionAuth(req, res)) {
		return;
	}

	// Forward to talkback, then add CORS headers to the response.
	// Inject Basic Auth so that, in record mode, talkback can authenticate
	// against the real Pulp (the mock session cookie is fake).
	const forwardedHeaders = { ...req.headers, authorization: BASIC_AUTH };

	const options = {
		hostname: 'localhost',
		port: TALKBACK_PORT + 1,
		path: req.url,
		method: req.method,
		headers: forwardedHeaders
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
			`Talkback CORS proxy on http://localhost:${TALKBACK_PORT} → talkback:${TALKBACK_PORT + 1} → ${PULP_HOST}`
		);
	});
});
