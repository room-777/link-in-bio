// Merged into /update/free-linktree-alternatives (2026-10-14).
// A route handler is used instead of next.config redirects() because vinext's
// config redirects only emit 307/308; Search Console guidance asked for a 301.
export function GET(request: Request) {
	return Response.redirect(
		new URL("/update/free-linktree-alternatives", request.url),
		301,
	);
}
