import type { BetterAuthPlugin, GenericEndpointContext } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";

const createdEmailOtpUser = Symbol("createdEmailOtpUser");

type SignupAuthContext = GenericEndpointContext["context"] & {
	[createdEmailOtpUser]?: true;
};

export function createEmailOtpSignupHooks() {
	return {
		user: {
			create: {
				after: async (
					_user: unknown,
					context: GenericEndpointContext | null,
				) => {
					if (context?.path === "/sign-in/email-otp") {
						(context.context as SignupAuthContext)[createdEmailOtpUser] = true;
					}
				},
			},
		},
	};
}

export const emailOtpSignupStatusPlugin = {
	id: "email-otp-signup-status",
	hooks: {
		after: [
			{
				matcher: ({ path }) => path === "/sign-in/email-otp",
				handler: createAuthMiddleware(async (context) => {
					const returned = context.context.returned;
					if (returned instanceof Response) {
						if (returned.status !== 200) return;
						const body = await returned.clone().json();
						if (!body || typeof body !== "object" || Array.isArray(body))
							return;
						context.context.returned = Response.json(
							{
								...body,
								isNewUser:
									(context.context as SignupAuthContext)[
										createdEmailOtpUser
									] === true,
							},
							{ headers: returned.headers, status: returned.status },
						);
						return;
					}
					if (
						!returned ||
						typeof returned !== "object" ||
						Array.isArray(returned)
					)
						return;
					context.context.returned = {
						...returned,
						isNewUser:
							(context.context as SignupAuthContext)[createdEmailOtpUser] ===
							true,
					};
				}),
			},
		],
	},
} satisfies BetterAuthPlugin;
