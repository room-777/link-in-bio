export function getCookieAttributes(baseURL: string): {
	sameSite: "lax" | "none";
	secure: boolean;
} {
	const secure = new URL(baseURL).protocol === "https:";
	return { sameSite: secure ? "none" : "lax", secure };
}

export function shouldEnableCrossSubDomainCookies(baseURL: string): boolean {
	const hostname = new URL(baseURL).hostname;
	return hostname === "grabbin.me" || hostname.endsWith(".grabbin.me");
}
