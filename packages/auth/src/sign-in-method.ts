import type { GenericEndpointContext } from "better-auth";
import type { ServerEventTracker } from "./google-analytics";

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

/**
 * Better Auth database hooks that report each sign-in to GA: sign_up for a
 * new account, login for an existing one. Other new sessions are ignored.
 */
export function createSignInDatabaseHooks(
	tracker: Pick<ServerEventTracker, "trackSignIn">,
) {
	return {
		session: {
			create: {
				after: async (
					session: { userId: string },
					context: GenericEndpointContext | null,
				) => {
					const method = getSignInMethod(context);
					if (!method) return;
					tracker.trackSignIn({
						userId: session.userId,
						headers: context?.headers ?? context?.request?.headers,
						method,
					});
				},
			},
		},
	};
}
