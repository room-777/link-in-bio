import { creem } from "@creem_io/better-auth";
import { createDb } from "@grabbin/db";
import * as schema from "@grabbin/db/schema/index";
import { sendVerificationOTP as sendVerificationOTPEmail } from "@grabbin/email";
import { env } from "@grabbin/env/server";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";

const socialProviders: BetterAuthOptions["socialProviders"] = {
	...(env.GOOGLE_CLIENT_ID
		? {
				google: {
					clientId: env.GOOGLE_CLIENT_ID,
					clientSecret: env.GOOGLE_CLIENT_SECRET,
				},
			}
		: {}),
	...(env.GITHUB_CLIENT_ID
		? {
				github: {
					clientId: env.GITHUB_CLIENT_ID,
					clientSecret: env.GITHUB_CLIENT_SECRET,
				},
			}
		: {}),
	...(env.TWITTER_CLIENT_ID
		? {
				twitter: {
					clientId: env.TWITTER_CLIENT_ID,
					clientSecret: env.TWITTER_CLIENT_SECRET,
				},
			}
		: {}),
};

const authOptions: BetterAuthOptions = {
	basePath: "/auth",
	trustedOrigins: [env.CORS_ORIGIN],
	user: {
		additionalFields: {
			primaryPageId: {
				type: "string",
				required: false,
				input: false,
			},
			role: {
				type: "string",
				required: true,
				defaultValue: "user",
				input: false,
			},
		},
	},
	account: {
		accountLinking: {
			enabled: true,
			trustedProviders: ["google", "github", "twitter"],
		},
	},
	socialProviders,
	plugins: [
		emailOTP({
			sendVerificationOTP: ({ email, otp, type }) =>
				sendVerificationOTPEmail({
					apiKey: env.RESEND_API_KEY,
					from: env.RESEND_FROM_EMAIL,
					email,
					otp,
					type,
				}),
		}),
		creem({
			apiKey: env.CREEM_API_KEY,
			webhookSecret: env.CREEM_WEBHOOK_SECRET,
			testMode: env.CREEM_TEST_MODE === "true",
			defaultSuccessUrl: env.CREEM_SUCCESS_URL,
			persistSubscriptions: true,
			onGrantAccess: async ({ reason, status }) => {
				console.info("[creem] subscription access granted", {
					reason,
					status,
				});
			},
			onRevokeAccess: async ({ reason, status }) => {
				console.info("[creem] subscription access revoked", {
					reason,
					status,
				});
			},
			onSubscriptionScheduledCancel: async ({ status }) => {
				console.info("[creem] subscription scheduled for cancellation", {
					status,
				});
			},
		}),
	],
	// uncomment cookieCache setting when ready to deploy to Cloudflare using *.workers.dev domains
	session: {
		cookieCache: {
			enabled: true,
			maxAge: 300, // 5 minutes
		},
	},
	secret: env.BETTER_AUTH_SECRET,
	baseURL: env.BETTER_AUTH_URL,
	advanced: {
		defaultCookieAttributes: {
			sameSite: "none",
			secure: true,
			httpOnly: true,
		},
		// uncomment crossSubDomainCookies setting when ready to deploy and replace <your-workers-subdomain> with your actual workers subdomain
		// https://developers.cloudflare.com/workers/wrangler/configuration/#workersdev
		// crossSubDomainCookies: {
		//   enabled: true,
		//   domain: "<your-workers-subdomain>",
		// },
	},
};

export type AuthOptions = typeof authOptions;
export type Session = ReturnType<
	typeof betterAuth<AuthOptions>
>["$Infer"]["Session"];

export async function createAuth() {
	return betterAuth({
		...authOptions,
		database: drizzleAdapter(await createDb(), {
			provider: "pg",
			schema: {
				...schema,
				creem_subscription: schema.creemSubscription,
			},
		}),
	});
}
