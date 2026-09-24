export function getCookieAttributes(baseURL: string): {
	sameSite: "lax" | "none";
	secure: boolean;
} {
	const secure = new URL(baseURL).protocol === "https:";
	return { sameSite: secure ? "none" : "lax", secure };
}
