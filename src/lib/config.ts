declare global {
	interface Window {
		__PULPHUB__?: { PULP_URL?: string };
	}
}

function readPulpUrl(): string {
	if (typeof window === 'undefined') return '';
	const raw = window.__PULPHUB__?.PULP_URL ?? '';
	return raw.replace(/\/+$/, '');
}

export const PULP_URL = readPulpUrl();
