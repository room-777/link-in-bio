type SignInContext = {
	path?: string;
	params?: Record<string, string | undefined>;
	body?: unknown;
} | null;

/**
 * The GA `method` of a session created by a sign-in, or null when a session
 * is created for another reason (it is then neither a sign_up nor a login).
 */
export function getSignInMethod(context: SignInContext) {
	const path = context?.path ?? "";
	if (path === "/sign-in/email-otp") return "email";
	const callback = /^\/(?:oauth2\/)?callback\/([^/]+)$/.exec(path);
	if (callback) return context?.params?.id ?? callback[1] ?? null;
	if (path === "/sign-in/social") {
		const provider = (context?.body as { provider?: unknown } | undefined)
			?.provider;
		return typeof provider === "string" ? provider : null;
	}
	return null;
}
