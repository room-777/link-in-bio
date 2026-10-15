/**
 * Production-resource guard for tests and local scripts.
 *
 * Rule: local machines, bot machines, and CI test jobs never use production
 * keys or resources. Only the Deploy workflow (GitHub "production"
 * environment) holds them. Tests call these helpers before they connect to
 * anything, so a test pointed at production stops instead of running.
 */

/** Hosts that only exist in production (Supabase cloud, Cloudflare R2). */
const PRODUCTION_HOST_PATTERNS = [
	/(^|\.)supabase\.co$/i,
	/(^|\.)supabase\.com$/i,
	/(^|\.)r2\.cloudflarestorage\.com$/i,
	/(^|\.)grabbin\.me$/i,
];

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

export class ProductionResourceError extends Error {
	constructor(message: string) {
		super(
			`${message} Tests and local scripts must use local resources only (see CONTRIBUTING.md, "Production keys").`,
		);
		this.name = "ProductionResourceError";
	}
}

function parseUrl(value: string): URL | null {
	try {
		return new URL(value);
	} catch {
		return null;
	}
}

export function isProductionHost(hostname: string) {
	return PRODUCTION_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}

/**
 * Throws unless `url` is a Postgres URL on this machine whose database name is
 * exactly `database` (a throwaway test database, never `postgres`).
 */
export function assertLocalTestDatabase(url: string, database: string) {
	const parsed = parseUrl(url);
	if (!parsed || !/^postgres(ql)?:$/.test(parsed.protocol))
		throw new ProductionResourceError("The test database URL is not valid.");
	if (!LOCAL_HOSTS.has(parsed.hostname))
		throw new ProductionResourceError(
			`The test database host "${parsed.hostname}" is not local.`,
		);
	const name = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
	if (name !== database)
		throw new ProductionResourceError(
			`The test database must be "${database}" (got "${name}").`,
		);
}

/** Throws when R2 S3 credentials point at a real Cloudflare R2 endpoint. */
export function assertLocalR2Credentials(credentials: string) {
	let endpoint = "";
	try {
		endpoint = String(JSON.parse(credentials).endpoint ?? "");
	} catch {
		throw new ProductionResourceError("R2 credentials are not valid JSON.");
	}
	const parsed = parseUrl(endpoint);
	if (!parsed || !LOCAL_HOSTS.has(parsed.hostname))
		throw new ProductionResourceError(
			`The R2 endpoint "${parsed?.hostname ?? endpoint}" is not local.`,
		);
}

/**
 * Throws when the process environment carries production markers: a
 * production NODE_ENV, a production host in a test, R2, S3, database, or
 * bucket variable, or R2 credentials for a non-local endpoint. Values are
 * never printed.
 */
export function assertNoProductionEnvironment(
	environment: Record<string, string | undefined> = process.env,
) {
	if (environment.NODE_ENV === "production")
		throw new ProductionResourceError("NODE_ENV is production.");
	for (const [name, value] of Object.entries(environment)) {
		if (!value) continue;
		if (name === "R2_S3_CREDENTIALS") assertLocalR2Credentials(value);
		for (const match of value.matchAll(/[a-z][a-z0-9+.-]*:\/\/[^\s"'<>]+/gi)) {
			const host = parseUrl(match[0])?.hostname;
			if (
				host &&
				isProductionHost(host) &&
				/TEST|R2|S3|BUCKET|DATABASE/i.test(name)
			)
				throw new ProductionResourceError(
					`${name} points at a production host.`,
				);
		}
	}
}
