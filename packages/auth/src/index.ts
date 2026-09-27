import { creem } from "@creem_io/better-auth";
import { createDb, type DatabaseClient } from "@grabbin/db";
import * as schema from "@grabbin/db/schema/index";
import {
	sendDeleteAccountVerification as sendDeleteAccountVerificationEmail,
	sendVerificationOTP as sendVerificationOTPEmail,
} from "@grabbin/email";
import { env } from "@grabbin/env/server";
import { getPlanAccess } from "@grabbin/plan";
import {
	type BetterAuthOptions,
	type BetterAuthPlugin,
	betterAuth,
} from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { customSession, emailOTP } from "better-auth/plugins";

import { getCookieAttributes } from "./cookie-attributes";
import { createCreemClient, retrieveSubscription } from "./creem-server";
import {
	syncCreemCheckout,
	syncCreemRefund,
	syncCreemWebhook,
} from "./creem-webhook";

type CreemEventData = {
	webhookId: string;
	webhookCreatedAt: number;
	id: string;
	status: string;
	product: { id: string };
	customer?: { id: string } | null;
	metadata?: Record<string, unknown> | null;
	current_period_start_date?: Date | number | string | null;
	current_period_end_date?: Date | number | string | null;
	cancel_at_period_end?: boolean;
	order?: { id: string } | string | null;
};

function createCreemPlugin(
	db: DatabaseClient,
	onSubscriptionChange?: (userId: string) => Promise<void>,
): BetterAuthPlugin {
	const syncEvent = async (event: CreemEventData) => {
		const result = await syncCreemWebhook(db, event);
		if (result) await onSubscriptionChange?.(result.userId);
	};
	return creem({
		apiKey: env.CREEM_API_KEY,
		webhookSecret: env.CREEM_WEBHOOK_SECRET,
		testMode: env.CREEM_TEST_MODE === "true",
		defaultSuccessUrl: env.CREEM_SUCCESS_URL,
		persistSubscriptions: true,
		onRefundCreated: async (data) => {
			const result = await syncCreemRefund(db, data);
			if (result) await onSubscriptionChange?.(result.userId);
		},
		onCheckoutCompleted: async (data) => {
			const directResult = data.subscription
				? await syncCreemWebhook(db, {
						...data.subscription,
						webhookId: data.webhookId,
						webhookCreatedAt: data.webhookCreatedAt,
						product: data.product,
						customer: data.customer,
						metadata: data.metadata,
						order: data.order,
					})
				: null;
			if (directResult) {
				await onSubscriptionChange?.(directResult.userId);
				return;
			}
			const result = await syncCreemCheckout(
				db,
				{
					id: data.id,
					webhookId: data.webhookId,
					webhookCreatedAt: data.webhookCreatedAt,
				},
				(id) => {
					const client = createCreemClient({
						apiKey: env.CREEM_API_KEY,
						testMode: env.CREEM_TEST_MODE === "true",
					});
					return client.checkouts.retrieve(id);
				},
				(id) => {
					return retrieveSubscription(
						{
							apiKey: env.CREEM_API_KEY,
							testMode: env.CREEM_TEST_MODE === "true",
						},
						id,
					);
				},
			);
			if (result) await onSubscriptionChange?.(result.userId);
		},
		onSubscriptionActive: syncEvent,
		onSubscriptionTrialing: syncEvent,
		onSubscriptionScheduledCancel: syncEvent,
		onSubscriptionCanceled: syncEvent,
		onSubscriptionPaid: syncEvent,
		onSubscriptionExpired: syncEvent,
		onSubscriptionUnpaid: syncEvent,
		onSubscriptionUpdate: syncEvent,
		onSubscriptionPastDue: syncEvent,
		onSubscriptionPaused: syncEvent,
	});
}

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
		deleteUser: {
			enabled: true,
			sendDeleteAccountVerification: ({ user, url }) =>
				sendDeleteAccountVerificationEmail({
					apiKey: env.RESEND_API_KEY,
					from: env.RESEND_FROM_EMAIL,
					email: user.email,
					url,
				}),
		},
		additionalFields: {
			primaryPageHandle: {
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
		customSession(async ({ user, session }, context) => {
			const subscriptions = (await context.context.adapter.findMany({
				model: "creem_subscription",
				where: [{ field: "referenceId", value: user.id }],
			})) as Array<{
				creemSubscriptionId: string | null;
				productId: string;
				status: string | null;
				periodEnd: Date | null;
				cancelAtPeriodEnd: boolean | null;
			}>;
			const access = getPlanAccess(
				subscriptions.map((subscription) => ({
					subscriptionId: subscription.creemSubscriptionId,
					productId: subscription.productId,
					status: subscription.status,
					periodEnd: subscription.periodEnd
						? new Date(subscription.periodEnd)
						: null,
					cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
				})),
				[
					env.CREEM_PRO_MONTHLY_PRODUCT_ID,
					env.CREEM_PRO_YEARLY_PRODUCT_ID,
				].filter(Boolean),
			);
			return {
				user,
				session,
				plan: {
					tier: access.tier,
					pageLimit: access.pageLimit,
					hasAccess: access.hasAccess,
					status: access.status,
					periodEnd: access.periodEnd?.toISOString() ?? null,
					cancelAtPeriodEnd: access.cancelAtPeriodEnd,
				},
			};
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
			...getCookieAttributes(env.BETTER_AUTH_URL),
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

export async function createAuth(
	database?: DatabaseClient,
	options?: { onSubscriptionChange?: (userId: string) => Promise<void> },
) {
	const resolvedDatabase = database ?? (await createDb());
	return betterAuth({
		...authOptions,
		plugins: [
			...(authOptions.plugins ?? []),
			createCreemPlugin(resolvedDatabase, options?.onSubscriptionChange),
		],
		database: drizzleAdapter(resolvedDatabase, {
			provider: "pg",
			schema: {
				...schema,
				creem_subscription: schema.creemSubscription,
			},
		}),
	});
}
