import { auth } from '$lib/auth.svelte';
import { goto } from '$app/navigation';

/**
 * Fetch a Pulp API endpoint using Basic Auth.
 * URL is absolute (built from auth.pulpUrl).
 */
async function pulpFetch(url: string): Promise<Response> {
	const res = await fetch(url, {
		headers: { Authorization: auth.basicAuthHeader }
	});

	if (res.status === 401) {
		auth.logout();
		await goto('/');
		throw new Error('Session expired');
	}

	return res;
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

export interface ContainerRepository {
	pulp_href: string;
	name: string;
	latest_version_href: string;
}

export interface ContainerTag {
	pulp_href: string;
	name: string;
	tagged_manifest: string;
	pulp_created: string;
}

export interface ContainerManifest {
	pulp_href: string;
	digest: string;
	schema_version: number;
	media_type: string;
	listed_manifests: string[];
	config_blob: string | null;
	blobs: string[];
	type: string;
	architecture: string | null;
	os: string | null;
	compressed_image_size: number | null;
}

export interface ContainerBlob {
	pulp_href: string;
	digest: string;
}

/**
 * List container distributions with pagination.
 */
export async function getDistributions(
	limit = 20,
	offset = 0
): Promise<PulpPaginated<ContainerDistribution>> {
	const url = `${auth.pulpUrl}/pulp/api/v3/distributions/container/container/?limit=${limit}&offset=${offset}`;
	const res = await pulpFetch(url);
	if (!res.ok) throw new Error(`Pulp API error: ${res.status}`);
	return res.json();
}

/**
 * Get a single distribution by name. Returns null if not found.
 */
export async function getDistribution(name: string): Promise<ContainerDistribution | null> {
	const url = `${auth.pulpUrl}/pulp/api/v3/distributions/container/container/?name=${encodeURIComponent(name)}`;
	const res = await pulpFetch(url);
	if (!res.ok) throw new Error(`Pulp API error: ${res.status}`);
	const data: PulpPaginated<ContainerDistribution> = await res.json();
	return data.results[0] ?? null;
}

/**
 * Get a repository by href.
 */
export async function getRepository(href: string): Promise<ContainerRepository> {
	const res = await pulpFetch(`${auth.pulpUrl}${href}`);
	if (!res.ok) throw new Error(`Pulp API error: ${res.status}`);
	return res.json();
}

/**
 * Get tags for a repository version.
 */
export async function getTags(repoVersionHref: string): Promise<PulpPaginated<ContainerTag>> {
	const url = `${auth.pulpUrl}/pulp/api/v3/content/container/tags/?repository_version=${encodeURIComponent(repoVersionHref)}&limit=100`;
	const res = await pulpFetch(url);
	if (!res.ok) throw new Error(`Pulp API error: ${res.status}`);
	return res.json();
}

/**
 * Get a single tag by name within a repository version.
 */
export async function getTag(
	repoVersionHref: string,
	tagName: string
): Promise<ContainerTag | null> {
	const url = `${auth.pulpUrl}/pulp/api/v3/content/container/tags/?repository_version=${encodeURIComponent(repoVersionHref)}&name=${encodeURIComponent(tagName)}`;
	const res = await pulpFetch(url);
	if (!res.ok) throw new Error(`Pulp API error: ${res.status}`);
	const data: PulpPaginated<ContainerTag> = await res.json();
	return data.results[0] ?? null;
}

/**
 * Get a manifest by href.
 */
export async function getManifest(href: string): Promise<ContainerManifest> {
	const res = await pulpFetch(`${auth.pulpUrl}${href}`);
	if (!res.ok) throw new Error(`Pulp API error: ${res.status}`);
	return res.json();
}

/**
 * Get a blob by href.
 */
export async function getBlob(href: string): Promise<ContainerBlob> {
	const res = await pulpFetch(`${auth.pulpUrl}${href}`);
	if (!res.ok) throw new Error(`Pulp API error: ${res.status}`);
	return res.json();
}

// ── File plugin types ────────────────────────────────────────

export interface FileDistribution {
	pulp_href: string;
	name: string;
	base_path: string;
	base_url: string | null;
	repository: string;
	publication: string | null;
}

export interface FileRepository {
	pulp_href: string;
	name: string;
	latest_version_href: string;
}

export interface FileContent {
	pulp_href: string;
	relative_path: string;
	sha256: string;
	artifact: string;
}

export interface PulpArtifact {
	pulp_href: string;
	size: number;
	sha256: string;
}

// ── File plugin functions ────────────────────────────────────

/**
 * List file distributions with pagination.
 */
export async function getFileDistributions(
	limit = 20,
	offset = 0
): Promise<PulpPaginated<FileDistribution>> {
	const url = `${auth.pulpUrl}/pulp/api/v3/distributions/file/file/?limit=${limit}&offset=${offset}`;
	const res = await pulpFetch(url);
	if (!res.ok) throw new Error(`Pulp API error: ${res.status}`);
	return res.json();
}

/**
 * Get a single file distribution by name. Returns null if not found.
 */
export async function getFileDistribution(name: string): Promise<FileDistribution | null> {
	const url = `${auth.pulpUrl}/pulp/api/v3/distributions/file/file/?name=${encodeURIComponent(name)}`;
	const res = await pulpFetch(url);
	if (!res.ok) throw new Error(`Pulp API error: ${res.status}`);
	const data: PulpPaginated<FileDistribution> = await res.json();
	return data.results[0] ?? null;
}

/**
 * Get a file repository by href.
 */
export async function getFileRepository(href: string): Promise<FileRepository> {
	const res = await pulpFetch(`${auth.pulpUrl}${href}`);
	if (!res.ok) throw new Error(`Pulp API error: ${res.status}`);
	return res.json();
}

/**
 * Get file contents for a repository version.
 */
export async function getFileContents(
	repoVersionHref: string,
	limit = 100,
	offset = 0
): Promise<PulpPaginated<FileContent>> {
	const url = `${auth.pulpUrl}/pulp/api/v3/content/file/files/?repository_version=${encodeURIComponent(repoVersionHref)}&limit=${limit}&offset=${offset}`;
	const res = await pulpFetch(url);
	if (!res.ok) throw new Error(`Pulp API error: ${res.status}`);
	return res.json();
}

/**
 * Get an artifact by href.
 */
export async function getArtifact(href: string): Promise<PulpArtifact> {
	const res = await pulpFetch(`${auth.pulpUrl}${href}`);
	if (!res.ok) throw new Error(`Pulp API error: ${res.status}`);
	return res.json();
}

// ── Pull-through types ───────────────────────────────────────

export interface PullThroughRemote {
	pulp_href: string;
	name: string;
	url: string;
}

export interface ContainerPullThroughDistribution {
	pulp_href: string;
	name: string;
	base_path: string;
	remote: string;
}

export interface PythonDistribution {
	pulp_href: string;
	name: string;
	base_path: string;
	remote: string | null;
	repository: string | null;
}

export interface NpmDistribution {
	pulp_href: string;
	name: string;
	base_path: string;
	remote: string | null;
}

export interface PulpStatus {
	versions: { component: string; version: string }[];
}

// ── Pull-through functions ───────────────────────────────────

/**
 * Get Pulp status (plugins, versions).
 */
export async function getStatus(): Promise<PulpStatus> {
	const res = await pulpFetch(`${auth.pulpUrl}/pulp/api/v3/status/`);
	if (!res.ok) throw new Error(`Pulp API error: ${res.status}`);
	return res.json();
}

/**
 * List container pull-through distributions.
 */
export async function getContainerPullThroughDistributions(): Promise<
	PulpPaginated<ContainerPullThroughDistribution>
> {
	const res = await pulpFetch(
		`${auth.pulpUrl}/pulp/api/v3/distributions/container/pull-through/?limit=100`
	);
	if (!res.ok) throw new Error(`Pulp API error: ${res.status}`);
	return res.json();
}

/**
 * List Python distributions that have a remote (= pull-through).
 */
export async function getPythonDistributions(): Promise<PulpPaginated<PythonDistribution>> {
	const res = await pulpFetch(`${auth.pulpUrl}/pulp/api/v3/distributions/python/pypi/?limit=100`);
	if (!res.ok) throw new Error(`Pulp API error: ${res.status}`);
	return res.json();
}

/**
 * List npm distributions that have a remote (= pull-through).
 */
export async function getNpmDistributions(): Promise<PulpPaginated<NpmDistribution>> {
	const res = await pulpFetch(`${auth.pulpUrl}/pulp/api/v3/distributions/npm/npm/?limit=100`);
	if (!res.ok) throw new Error(`Pulp API error: ${res.status}`);
	return res.json();
}

/**
 * Get a remote by href (works for any plugin type).
 */
export async function getRemote(href: string): Promise<PullThroughRemote> {
	const res = await pulpFetch(`${auth.pulpUrl}${href}`);
	if (!res.ok) throw new Error(`Pulp API error: ${res.status}`);
	return res.json();
}

// ── Users ────────────────────────────────────────────────────

export interface PulpUser {
	pulp_href: string;
	id: number;
	username: string;
	first_name: string;
	last_name: string;
	email: string;
	is_staff: boolean;
	is_active: boolean;
	date_joined: string;
	groups: string[];
}

export async function getUsers(limit = 20, offset = 0): Promise<PulpPaginated<PulpUser>> {
	const res = await pulpFetch(`${auth.pulpUrl}/pulp/api/v3/users/?limit=${limit}&offset=${offset}`);
	if (!res.ok) throw new Error(`Pulp API error: ${res.status}`);
	return res.json();
}
