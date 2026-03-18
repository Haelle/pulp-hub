/**
 * Authenticate against Pulp's Django session login.
 * Returns sessionid and csrftoken cookies on success.
 */
export async function pulpLogin(
	baseUrl: string,
	username: string,
	password: string
): Promise<{ sessionid: string; csrftoken: string }> {
	// Step 1: GET login page for CSRF token
	const loginUrl = `${baseUrl}/auth/login/`;
	const csrfResponse = await fetch(loginUrl);

	const csrfCookie = csrfResponse.headers.getSetCookie().find((c) => c.startsWith('csrftoken='));
	if (!csrfCookie) throw new Error('No CSRF token from Pulp');
	const csrfToken = csrfCookie.split('=')[1].split(';')[0];

	// Step 2: POST login with CSRF + credentials
	const form = new URLSearchParams();
	form.set('username', username);
	form.set('password', password);
	form.set('csrfmiddlewaretoken', csrfToken);

	const loginResponse = await fetch(loginUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Cookie: `csrftoken=${csrfToken}`,
			'X-CSRFToken': csrfToken
		},
		body: form.toString(),
		redirect: 'manual'
	});

	if (loginResponse.status !== 302) {
		throw new Error('Invalid credentials');
	}

	const cookies = loginResponse.headers.getSetCookie();
	const sessionCookie = cookies.find((c) => c.startsWith('sessionid='));
	const newCsrfCookie = cookies.find((c) => c.startsWith('csrftoken='));

	if (!sessionCookie) throw new Error('No session cookie from Pulp');

	const sessionid = sessionCookie.split('=')[1].split(';')[0];
	const newCsrfToken = newCsrfCookie
		? newCsrfCookie.split('=')[1].split(';')[0]
		: csrfToken;

	return { sessionid, csrftoken: newCsrfToken };
}

/**
 * Fetch a Pulp API endpoint using session cookie auth.
 */
export function pulpFetch(url: string, sessionid: string): Promise<Response> {
	return fetch(url, {
		headers: { Cookie: `sessionid=${sessionid}` }
	});
}

export interface PulpPaginated<T> {
	count: number;
	next: string | null;
	previous: string | null;
	results: T[];
}

export interface ContainerDistribution {
	pulp_href: string;
	name: string;
	base_path: string;
	repository: string;
	registry_path: string;
	description: string | null;
}

/**
 * List container distributions with pagination.
 */
export async function getDistributions(
	baseUrl: string,
	sessionid: string,
	limit = 20,
	offset = 0
): Promise<PulpPaginated<ContainerDistribution>> {
	const url = `${baseUrl}/pulp/api/v3/distributions/container/container/?limit=${limit}&offset=${offset}`;
	const res = await pulpFetch(url, sessionid);
	if (!res.ok) throw new Error(`Pulp API error: ${res.status}`);
	return res.json();
}
