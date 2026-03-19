import { goto } from '$app/navigation';

const STORAGE_KEY = 'pulphub_auth';

interface AuthState {
	pulpUrl: string;
	username: string;
	password: string;
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

const stored = loadFromStorage();

let pulpUrl = $state(stored?.pulpUrl ?? '');
let username = $state(stored?.username ?? '');
let password = $state(stored?.password ?? '');
let authenticated = $state(!!stored);

export const auth = {
	get pulpUrl() {
		return pulpUrl;
	},
	get username() {
		return username;
	},
	get authenticated() {
		return authenticated;
	},
	get basicAuthHeader() {
		return 'Basic ' + btoa(username + ':' + password);
	},

	async login(url: string, user: string, pass: string): Promise<void> {
		const base = url.replace(/\/+$/, '');
		const header = 'Basic ' + btoa(user + ':' + pass);

		// Use a protected endpoint to validate credentials
		// (status/ is public and returns 200 even with bad credentials)
		const res = await fetch(
			`${base}/pulp/api/v3/distributions/container/container/?limit=0`,
			{ headers: { Authorization: header } }
		);

		if (!res.ok) {
			if (res.status === 401 || res.status === 403) {
				throw new Error('Invalid credentials');
			}
			throw new Error(`Pulp API error: ${res.status}`);
		}

		pulpUrl = base;
		username = user;
		password = pass;
		authenticated = true;
		saveToStorage({ pulpUrl: base, username: user, password: pass });
	},

	logout() {
		pulpUrl = '';
		username = '';
		password = '';
		authenticated = false;
		clearStorage();
		goto('/');
	}
};
