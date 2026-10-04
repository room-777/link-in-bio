import { env } from "@grabbin/env/web";

function hostnameFromAuthority(authority: string | null) {
	if (!authority) return null;
	const value = authority.split(",", 1)[0]?.trim();
	if (!value) return null;
	try {
		const url = /^[a-z][a-z\d+.-]*:\/\//i.test(value)
			? value
			: `https://${value}`;
		return new URL(url).hostname.toLowerCase();
	} catch {
		return null;
	}
}

function isLocalHostname(hostname: string) {
	return (
		hostname === "localhost" ||
		hostname.endsWith(".localhost") ||
		hostname === "127.0.0.1" ||
		hostname === "::1"
	);
}

/** Returns an incoming custom hostname, or null for Grabbin and local requests. */
export function getCustomDomainHostname(authority: string | null) {
	const hostname = hostnameFromAuthority(authority);
	if (!hostname || isLocalHostname(hostname)) return null;

	const configuredDomain = env.NEXT_PUBLIC_PAGE_DOMAIN ?? "grabbin.me";
	const serviceHostname = hostnameFromAuthority(configuredDomain);
	if (
		serviceHostname &&
		(hostname === serviceHostname || hostname.endsWith(`.${serviceHostname}`))
	) {
		return null;
	}

	return hostname;
}
