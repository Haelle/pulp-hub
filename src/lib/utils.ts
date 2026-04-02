import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };

/**
 * Format bytes to human-readable string.
 */
export function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const units = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Derive a Docker Hub URL from a distribution name.
 * Supports patterns like "dockerhub/library/alpine" or "dockerhub-cache/kizaing/kavita".
 * Returns null if the name doesn't look like a Docker Hub repo.
 */
export function dockerHubUrl(distributionName: string): string | null {
	const match = distributionName.match(/^dockerhub(?:-cache)?\/(.+)$/);
	if (!match) return null;

	const upstream = match[1];
	const libMatch = upstream.match(/^library\/(.+)$/);
	if (libMatch) {
		return `https://hub.docker.com/_/${libMatch[1]}`;
	}
	return `https://hub.docker.com/r/${upstream}`;
}

/**
 * Derive a Quay.io URL from a distribution name.
 * Supports patterns like "quay-cache/namespace/image".
 * Returns null if the name doesn't look like a Quay repo.
 */
export function quayUrl(distributionName: string): string | null {
	const match = distributionName.match(/^quay(?:-cache)?\/(.+)$/);
	if (!match) return null;

	return `https://quay.io/repository/${match[1]}`;
}

/**
 * Derive an upstream registry URL from a distribution name.
 * Returns { url, label } or null.
 */
export function hrefToId(href: string): string {
	return href.split('/').filter(Boolean).pop() ?? href;
}

export function formatDuration(start: string | null, end: string | null): string {
	if (!start || !end) return '—';
	const ms = new Date(end).getTime() - new Date(start).getTime();
	if (ms < 1000) return `${ms}ms`;
	const secs = Math.floor(ms / 1000);
	if (secs < 60) return `${secs}s`;
	const mins = Math.floor(secs / 60);
	const remSecs = secs % 60;
	if (mins < 60) return `${mins}m ${remSecs}s`;
	const hours = Math.floor(mins / 60);
	const remMins = mins % 60;
	return `${hours}h ${remMins}m`;
}

export function upstreamRegistryUrl(
	distributionName: string
): { url: string; label: string } | null {
	const hub = dockerHubUrl(distributionName);
	if (hub) return { url: hub, label: 'Docker Hub' };

	const quay = quayUrl(distributionName);
	if (quay) return { url: quay, label: 'Quay.io' };

	return null;
}
