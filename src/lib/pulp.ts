export function pulpFetch(url: string, auth: string): Promise<Response> {
	return fetch(url, {
		headers: { Authorization: `Basic ${auth}` }
	});
}
