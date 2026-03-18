import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, "child"> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, "children"> : T;
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
 * Derive a Docker Hub URL from a distribution name like "dockerhub/library/alpine".
 * Returns null if the name doesn't look like a Docker Hub repo.
 */
export function dockerHubUrl(distributionName: string): string | null {
	// Expected pattern: dockerhub/<upstream>
	const match = distributionName.match(/^dockerhub\/(.+)$/);
	if (!match) return null;

	const upstream = match[1];
	// Official images: library/<name> → hub.docker.com/_/<name>
	const libMatch = upstream.match(/^library\/(.+)$/);
	if (libMatch) {
		return `https://hub.docker.com/_/${libMatch[1]}`;
	}
	// User images: <namespace>/<name> → hub.docker.com/r/<namespace>/<name>
	return `https://hub.docker.com/r/${upstream}`;
}
