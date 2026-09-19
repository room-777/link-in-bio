const redirectBaseUrl = "https://grabbin.invalid";
const blockedRedirectPrefixes = ["/sign-in", "/auth", "/api"];

export function sanitizeAuthRedirect(value: unknown) {
	if (typeof value !== "string" || !value || value.includes("\\")) {
		return null;
	}
	if (!value.startsWith("/") || value.startsWith("//")) return null;

	try {
		const url = new URL(value, redirectBaseUrl);
		if (url.origin !== redirectBaseUrl) return null;
		if (
			blockedRedirectPrefixes.some(
				(prefix) =>
					url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
			)
		) {
			return null;
		}

		return `${url.pathname}${url.search}`;
	} catch {
		return null;
	}
}

export function getSignInHref(returnTo?: string | null) {
	const safeReturnTo = sanitizeAuthRedirect(returnTo);
	if (!safeReturnTo) return "/sign-in";

	return `/sign-in?${new URLSearchParams({ returnTo: safeReturnTo })}`;
}
