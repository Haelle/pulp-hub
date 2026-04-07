import { goto } from '$app/navigation';
import { PULP_URL } from '$lib/config';

const STORAGE_KEY = 'pulphub_auth';

type AuthMode = 'session' | 'basic';

interface AuthState {
	username: string;
	password: string;
	authMode: AuthMode;
}

function loadFromStorage(): AuthState | null {
	if (typeof sessionStorage === 'undefined') return null;
	const raw = sessionStorage.getItem(STORAGE_KEY);
	if (!raw) return null;
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

function saveToStorage(state: AuthState) {
	sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clearStorage() {
	sessionStorage.removeItem(STORAGE_KEY);
}

/**
 * Parse a cookie value from document.cookie or a Set-Cookie header.
 */
function getCookie(name: string): string | null {
	if (typeof document === 'undefined') return null;
	const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
	return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Check if the Pulp instance supports session auth by probing /auth/login/.
 */
async function detectSessionAuth(): Promise<boolean> {
	try {
		const res = await fetch(`${PULP_URL}/auth/login/`, {
			method: 'GET',
			credentials: 'include'
		});
		return res.ok;
	} catch {
		return false;
	}
}

/**
 * Perform session-based login: GET CSRF token, then POST credentials.
 * Returns true on success, false on invalid credentials.
 * Throws on network/server errors.
 */
async function sessionLogin(user: string, pass: string): Promise<boolean> {
	// Step 1: GET /auth/login/ to obtain CSRF cookie
	await fetch(`${PULP_URL}/auth/login/`, {
		method: 'GET',
		credentials: 'include'
	});

	const csrfToken = getCookie('csrftoken');
	if (!csrfToken) throw new Error('Failed to obtain CSRF token');

	// Step 2: POST /auth/login/ with credentials
	const formData = new URLSearchParams({ username: user, password: pass });
	const res = await fetch(`${PULP_URL}/auth/login/`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'X-CSRFToken': csrfToken
		},
		body: formData,
		credentials: 'include',
		redirect: 'manual' // Don't follow the 302
	});

	// Django returns 302 on success, 200 with login form on failure
	if (res.status === 302 || res.status === 0) {
		// Opaque redirect (status 0) happens with redirect: 'manual' in some browsers
		return true;
	}

	// 200 means the login form was re-displayed (bad credentials)
	if (res.ok) return false;

	throw new Error(`Session login error: ${res.status}`);
}

const stored = loadFromStorage();

let username = $state(stored?.username ?? '');
let password = $state(stored?.password ?? '');
let authMode = $state<AuthMode>(stored?.authMode ?? 'basic');
let authenticated = $state(!!stored);

export const auth = {
	get pulpUrl() {
		return PULP_URL;
	},
	get username() {
		return username;
	},
	get authenticated() {
		return authenticated;
	},
	get authMode() {
		return authMode;
	},
	get basicAuthHeader() {
		return 'Basic ' + btoa(username + ':' + password);
	},

	async login(user: string, pass: string, options?: { forceBasicAuth?: boolean }): Promise<void> {
		// Try session auth first, fall back to Basic Auth on any failure
		const supportsSession = options?.forceBasicAuth ? false : await detectSessionAuth();
		if (supportsSession) {
			try {
				const success = await sessionLogin(user, pass);
				if (!success) {
					throw new Error('Invalid credentials');
				}
				const check = await fetch(
					`${PULP_URL}/pulp/api/v3/distributions/container/container/?limit=0`,
					{ credentials: 'include' }
				);
				if (check.ok) {
					username = user;
					password = '';
					authMode = 'session';
					authenticated = true;
					saveToStorage({
						username: user,
						password: '',
						authMode: 'session'
					});
					return;
				}
			} catch (e) {
				// Invalid credentials → propagate, other errors → fall through to Basic Auth
				if (e instanceof Error && e.message === 'Invalid credentials') throw e;
			}
		}

		// Fallback: Basic Auth
		const header = 'Basic ' + btoa(user + ':' + pass);
		const res = await fetch(`${PULP_URL}/pulp/api/v3/distributions/container/container/?limit=0`, {
			headers: { Authorization: header }
		});

		if (!res.ok) {
			if (res.status === 401 || res.status === 403) {
				throw new Error('Invalid credentials');
			}
			throw new Error(`Pulp API error: ${res.status}`);
		}

		username = user;
		password = pass;
		authMode = 'basic';
		authenticated = true;
		saveToStorage({ username: user, password: pass, authMode: 'basic' });
	},

	logout() {
		if (authMode === 'session' && PULP_URL) {
			// Fire-and-forget logout request to clear server session
			const csrfToken = getCookie('csrftoken');
			fetch(`${PULP_URL}/auth/logout/`, {
				method: 'POST',
				credentials: 'include',
				headers: csrfToken ? { 'X-CSRFToken': csrfToken } : {}
			}).catch(() => {});
		}
		username = '';
		password = '';
		authMode = 'basic';
		authenticated = false;
		clearStorage();
		goto('/');
	}
};
