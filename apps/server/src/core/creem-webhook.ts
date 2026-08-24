import type { DatabaseClient } from "@db/index";
import { creemSubscription } from "@db/schema";
import {
	and,
	eq,
	isNull,
} from "drizzle-orm";

export type CreemWebhookState = {
	webhookId: string;
	webhookCreatedAt: number;
	status: string;
	productId: string;
	creemCustomerId: string | null;
	creemSubscriptionId: string;
	creemOrderId: string | null;
	periodStart: string | null;
	periodEnd: string | null;
	cancelAtPeriodEnd: boolean;
};

export type WebhookStateDecision =
	| {
			action: "accept";
			state: CreemWebhookState;
	  }
	| {
			action: "restore";
			state: CreemWebhookState;
	  };

export const decideCreemWebhookState = (
	previous: CreemWebhookState | null,
	incoming: CreemWebhookState,
): WebhookStateDecision => {
	if (
		previous &&
		incoming.webhookCreatedAt <=
			previous.webhookCreatedAt
	)
		return {
			action: "restore",
			state: previous,
		};

	return {
		action: "accept",
		state: incoming,
	};
};

export const webhookCreatedAtToDate = (
	createdAt: number,
) =>
	new Date(
		createdAt < 1_000_000_000_000
			? createdAt * 1000
			: createdAt,
	);

export type CreemWebhookInput = {
	webhookId: string;
	webhookCreatedAt: number;
	creemSubscriptionId: string;
	status: string;
	productId: string;
	creemCustomerId: string | null;
	creemOrderId?: string | null;
	periodStart?:
		| Date
		| number
		| string
		| null;
	periodEnd?:
		| Date
		| number
		| string
		| null;
	cancelAtPeriodEnd?: boolean;
};

const toIso = (
	date:
		| Date
		| number
		| string
		| null
		| undefined,
) => {
	if (
		date === null ||
		date === undefined
	)
		return null;
	if (date instanceof Date)
		return date.toISOString();
	const parsed = new Date(
		typeof date === "number" &&
			date < 1_000_000_000_000
			? date * 1000
			: date,
	);
	return Number.isNaN(parsed.getTime())
		? null
		: parsed.toISOString();
};

const stateToUpdate = (
	state: CreemWebhookState,
) => ({
	productId: state.productId,
	creemCustomerId:
		state.creemCustomerId,
	creemSubscriptionId:
		state.creemSubscriptionId,
	creemOrderId: state.creemOrderId,
	status: state.status,
	periodStart: state.periodStart
		? new Date(state.periodStart)
		: null,
	periodEnd: state.periodEnd
		? new Date(state.periodEnd)
		: null,
	cancelAtPeriodEnd:
		state.cancelAtPeriodEnd,
	lastWebhookId: state.webhookId,
	lastWebhookCreatedAt:
		webhookCreatedAtToDate(
			state.webhookCreatedAt,
		),
	lastWebhookState: state,
});

export const syncCreemWebhookState =
	async (
		db: DatabaseClient,
		input: CreemWebhookInput,
	) => {
		const subscription =
			await db.query.creemSubscription.findFirst(
				{
					where: eq(
						creemSubscription.creemSubscriptionId,
						input.creemSubscriptionId,
					),
				},
			);
		if (!subscription) return;

		const incoming: CreemWebhookState =
			{
				webhookId: input.webhookId,
				webhookCreatedAt:
					input.webhookCreatedAt,
				status:
					input.status.toLowerCase(),
				productId: input.productId,
				creemCustomerId:
					input.creemCustomerId,
				creemSubscriptionId:
					input.creemSubscriptionId,
				creemOrderId:
					input.creemOrderId ??
					subscription.creemOrderId,
				periodStart:
					toIso(input.periodStart) ??
					toIso(
						subscription.periodStart,
					),
				periodEnd:
					toIso(input.periodEnd) ??
					toIso(subscription.periodEnd),
				cancelAtPeriodEnd:
					input.cancelAtPeriodEnd ??
					subscription.cancelAtPeriodEnd,
			};
		const previous =
			subscription.lastWebhookState ??
			null;
		const decision =
			decideCreemWebhookState(
				previous,
				incoming,
			);

		await db
			.update(creemSubscription)
			.set(
				stateToUpdate(decision.state),
			)
			.where(
				and(
					eq(
						creemSubscription.id,
						subscription.id,
					),
					previous
						? eq(
								creemSubscription.lastWebhookId,
								previous.webhookId,
							)
						: isNull(
								creemSubscription.lastWebhookId,
							),
				),
			);
		return {
			accepted:
				decision.action === "accept",
			userId: subscription.referenceId,
			state: decision.state,
		};
	};
