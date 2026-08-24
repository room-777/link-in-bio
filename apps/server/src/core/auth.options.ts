/**
 * Custom options for Better Auth
 *
 * Docs: https://www.better-auth.com/docs/reference/options
 */

import { creem } from "@creem_io/better-auth";
import type { DatabaseClient } from "@db/index";
import type { BetterAuthOptions } from "better-auth/minimal";
import { customSession } from "better-auth/plugins/custom-session";
import { emailOTP } from "better-auth/plugins/email-otp";
import type { AppBindings } from "types/type";
import {
	reconcileUserPageLifecycle,
	restoreUserPagesAfterResubscribe,
	scheduleUserPagesAfterCancellation,
} from "../services/page-lifecycle.service";
import { getPlanAccess } from "./billing";
import { syncCreemWebhookState } from "./creem-webhook";
import {
	sendDeleteAccountVerificationEmail,
	sendVerificationOTPEmail,
} from "./email";

type Options = {
	db: DatabaseClient;
	backgroundTaskHandler?: (
		promise: Promise<unknown>,
	) => void;
};

export const betterAuthOptions = (
	env: AppBindings,
	{
		backgroundTaskHandler,
		db,
	}: Options,
) => {
	const frontendHostname = new URL(
		env.FRONTEND_URL,
	).hostname;
	const isLocalFrontend = [
		"localhost",
		"127.0.0.1",
	].includes(frontendHostname);
	const restorePages = (
		userId: string,
	) =>
		restoreUserPagesAfterResubscribe({
			db,
			userId,
		});
	const schedulePages = async (
		userId: string,
		periodEnd: Date,
	) => {
		await scheduleUserPagesAfterCancellation(
			{
				db,
				userId,
				periodEnd,
			},
		);
		if (periodEnd <= new Date())
			await reconcileUserPageLifecycle({
				db,
				userId,
			});
	};
	const syncSubscriptionEvent = async (
		data: {
			webhookId: string;
			webhookCreatedAt: number;
			id: string;
			status: string;
			product: { id: string };
			customer: { id: string };
			current_period_start_date:
				| Date
				| number
				| string;
			current_period_end_date:
				| Date
				| number
				| string;
		},
		cancelAtPeriodEnd = false,
	) => {
		await syncCreemWebhookState(db, {
			webhookId: data.webhookId,
			webhookCreatedAt:
				data.webhookCreatedAt,
			creemSubscriptionId: data.id,
			status: data.status,
			productId: data.product.id,
			creemCustomerId: data.customer.id,
			periodStart:
				data.current_period_start_date,
			periodEnd:
				data.current_period_end_date,
			cancelAtPeriodEnd,
		});
	};

	return {
		/**
		 * The name of the application.
		 */
		appName: "Grabbin",
		/**
		 * Base path for Better Auth.
		 * @default "/api/auth"
		 */
		basePath: "/auth",

		// .... More options
		user: {
			deleteUser: {
				enabled: true,
				sendDeleteAccountVerification:
					({ user, url }) =>
						sendDeleteAccountVerificationEmail(
							env,
							{
								email: user.email,
								url,
							},
						),
			},
			additionalFields: {
				role: {
					type: "string",
					required: true,
					input: false,
					defaultValue: "user",
				},
				primaryPageId: {
					type: "string",
					required: false,
					input: false,
				},
			},
		},
		account: {
			storeStateStrategy: "cookie",
			accountLinking: {
				enabled: true,
				trustedProviders: [
					"google",
					"twitter",
					"email-password",
				],
			},
		},
		emailAndPassword: {
			enabled: true,
		},
		plugins: [
			customSession(
				async ({ user, session }) => {
					const access =
						await getPlanAccess({
							db,
							userId: user.id,
						});

					return {
						user,
						session,
						entitlements: {
							tier: access.tier,
							hasAccess:
								access.hasAccess,
						},
					};
				},
			),
			emailOTP({
				expiresIn: 5 * 60,
				storeOTP: "hashed",
				sendVerificationOTP: async ({
					email,
					otp,
					type,
				}) => {
					const task =
						sendVerificationOTPEmail(
							env,
							{
								email,
								otp,
								type,
							},
						);
					if (backgroundTaskHandler) {
						backgroundTaskHandler(task);
						return;
					}
					return task;
				},
			}),
			creem({
				apiKey: env.CREEM_API_KEY,
				webhookSecret:
					env.CREEM_WEBHOOK_SECRET,
				testMode:
					env.CREEM_TEST_MODE ===
					"true",
				defaultSuccessUrl:
					env.CREEM_SUCCESS_URL,
				persistSubscriptions: true,
				onGrantAccess: async ({
					metadata,
				}) => {
					const userId =
						typeof metadata?.referenceId ===
						"string"
							? metadata.referenceId
							: null;
					if (userId)
						await restorePages(userId);
				},
				onRevokeAccess: async ({
					metadata,
					current_period_end_date,
				}) => {
					const userId =
						typeof metadata?.referenceId ===
						"string"
							? metadata.referenceId
							: null;
					const periodEnd = new Date(
						current_period_end_date,
					);
					if (
						userId &&
						!Number.isNaN(
							periodEnd.getTime(),
						)
					)
						await schedulePages(
							userId,
							periodEnd,
						);
				},
				onCheckoutCompleted: async (
					data,
				) => {
					const subscription =
						data.subscription;
					if (!subscription) return;
					await syncCreemWebhookState(
						db,
						{
							webhookId: data.webhookId,
							webhookCreatedAt:
								data.webhookCreatedAt,
							creemSubscriptionId:
								subscription.id,
							status:
								subscription.status,
							productId:
								data.product.id,
							creemCustomerId:
								data.customer?.id ??
								null,
							periodStart:
								subscription.current_period_start_date,
							periodEnd:
								subscription.current_period_end_date,
						},
					);
				},
				onSubscriptionActive: (data) =>
					syncSubscriptionEvent(data),
				onSubscriptionTrialing: (
					data,
				) =>
					syncSubscriptionEvent(data),
				onSubscriptionCanceled: (
					data,
				) =>
					syncSubscriptionEvent(
						data,
						true,
					),
				onSubscriptionPaid: (data) =>
					syncSubscriptionEvent(data),
				onSubscriptionExpired: (data) =>
					syncSubscriptionEvent(data),
				onSubscriptionUnpaid:
					syncSubscriptionEvent,
				onSubscriptionUpdate: (data) =>
					syncSubscriptionEvent(
						data,
						data.status ===
							"scheduled_cancel",
					),
				onSubscriptionPastDue:
					syncSubscriptionEvent,
				onSubscriptionPaused: (data) =>
					syncSubscriptionEvent(data),
			}),
		],
		socialProviders: {
			google: {
				clientId: env.GOOGLE_CLIENT_ID,
				clientSecret:
					env.GOOGLE_CLIENT_SECRET,
			},
			twitter: {
				clientId: env.TWITTER_CLIENT_ID,
				clientSecret:
					env.TWITTER_CLIENT_SECRET,
				scope: ["users.email"],
			},
		},
		advanced: {
			backgroundTasks: {
				handler: backgroundTaskHandler,
			},
			crossSubDomainCookies: {
				enabled: !isLocalFrontend,
				domain: frontendHostname,
			},
		},
	} as BetterAuthOptions;
};
