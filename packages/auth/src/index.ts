import { creem } from "@creem_io/better-auth";
import { createDb, type DatabaseClient } from "@grabbin/db";
import * as schema from "@grabbin/db/schema/index";
import {
	sendDeleteAccountVerification as sendDeleteAccountVerificationEmail,
	sendVerificationOTP as sendVerificationOTPEmail,
} from "@grabbin/email";
import { env } from "@grabbin/env/server";
import { getPlanAccess, type SubscriptionStatus } from "@grabbin/plan";
import {
	type BetterAuthOptions,
	type BetterAuthPlugin,
	betterAuth,
} from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { customSession, emailOTP } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { cancelSubscriptionsBeforeAccountDeletion } from "./account-deletion";
import {
	getCookieAttributes,
	shouldEnableCrossSubDomainCookies,
} from "./cookie-attributes";
import { createCreemClient, retrieveSubscription } from "./creem-server";
import {
	syncCreemCheckout,
	syncCreemDispute,
	syncCreemRefund,
	syncCreemWebhook,
} from "./creem-webhook";
import { serverEvents } from "./server-events";
import { createSignInDatabaseHooks } from "./sign-in-method";

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
		onDisputeCreated: async (data) => {
			const result = await syncCreemDispute(db, data);
			if (result) await onSubscriptionChange?.(result.userId);
		},
		onCheckoutCompleted: async (data) => {
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
			if (!result) return;
			if (result.purchase) {
				serverEvents.track({
					name: "purchase",
					userId: result.userId,
					params: result.purchase,
				});
			}
			await onSubscriptionChange?.(result.userId);
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

/** Session shape: the user's page handle and plan, read on every get-session. */
function planSession(
	getDatabase: () => DatabaseClient | Promise<DatabaseClient>,
) {
	return customSession(async ({ user, session }, context) => {
		// "pages" is not a Better Auth model, so the adapter cannot read it.
		const db = await getDatabase();
		const ownPage = await db.query.pages.findFirst({
			where: eq(schema.pages.userId, user.id),
			columns: { handle: true },
		});
		const subscriptions = (await context.context.adapter.findMany({
			model: "creem_subscription",
			where: [{ field: "referenceId", value: user.id }],
		})) as Array<{
			creemSubscriptionId: string | null;
			productId: string;
			status: SubscriptionStatus | null;
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
			user: { ...user, pageHandle: ownPage?.handle ?? null },
			session,
			plan: {
				tier: access.tier,
				hasAccess: access.hasAccess,
				status: access.status,
				periodEnd: access.periodEnd?.toISOString() ?? null,
				cancelAtPeriodEnd: access.cancelAtPeriodEnd,
			},
		};
	});
}

const authOptions = {
	basePath: "/auth",
	trustedOrigins: [env.CORS_ORIGIN],
	user: {
		deleteUser: {
			enabled: true,
			sendDeleteAccountVerification: ({ user, url }) =>
				sendDeleteAccountVerificationEmail({
					apiKey: env.RESEND_API_KEY,
					from: env.RESEND_FROM_EMAIL,
					templateId: env.RESEND_ACCOUNT_DELETION_TEMPLATE_ID,
					email: user.email,
					url,
				}),
		},
		additionalFields: {
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
			sendVerificationOTP: ({ email, otp }) =>
				sendVerificationOTPEmail({
					apiKey: env.RESEND_API_KEY,
					from: env.RESEND_FROM_EMAIL,
					templateId: env.RESEND_OTP_TEMPLATE_ID,
					email,
					otp,
				}),
		}),
		planSession(createDb),
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
		crossSubDomainCookies: {
			enabled: shouldEnableCrossSubDomainCookies(env.BETTER_AUTH_URL),
			domain: "grabbin.me",
		},
	},
} satisfies BetterAuthOptions;

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
		user: {
			...authOptions.user,
			deleteUser: {
				...authOptions.user.deleteUser,
				// Stop billing first; if Creem fails, the account is kept so nobody
				// is charged for an account that no longer exists.
				beforeDelete: (deleted) =>
					cancelSubscriptionsBeforeAccountDeletion(
						resolvedDatabase,
						deleted.id,
						{
							apiKey: env.CREEM_API_KEY,
							testMode: env.CREEM_TEST_MODE === "true",
						},
					),
			},
		},
		plugins: [
			...authOptions.plugins.filter((plugin) => plugin.id !== "custom-session"),
			planSession(() => resolvedDatabase),
			createCreemPlugin(resolvedDatabase, options?.onSubscriptionChange),
		],
		// GA sign_up for a new account, login for an existing one.
		databaseHooks: createSignInDatabaseHooks(serverEvents),
		database: drizzleAdapter(resolvedDatabase, {
			provider: "pg",
			schema: {
				...schema,
				creem_subscription: schema.creemSubscription,
			},
		}),
	});
}

export type Auth = Awaited<ReturnType<typeof createAuth>>;
