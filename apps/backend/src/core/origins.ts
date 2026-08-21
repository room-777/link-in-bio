const STATIC_ALLOWED_ORIGINS = [
	"http://localhost:3000",
	"https://grabbin.me",
] as const;

export function getAllowedOrigins(
	frontendUrl?: string,
) {
	return Array.from(
		new Set(
			[
				frontendUrl,
				...STATIC_ALLOWED_ORIGINS,
			].filter(
				(origin): origin is string =>
					Boolean(origin),
			),
		),
	);
}
