import type { DatabaseClient } from "@grabbin/db";
import { creemSubscription, user } from "@grabbin/db/schema/index";
import { and, eq, isNull, sql } from "drizzle-orm";

type CreemEvent = {
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

type SavedWebhookState = {
	productId: string;
	status: string;
	creemCustomerId: string | null;
	creemSubscriptionId: string;
	creemOrderId: string | null;
	periodStart: string | null;
	periodEnd: string | null;
	cancelAtPeriodEnd: boolean;
	lastWebhookId: string;
	lastWebhookCreatedAt: string;
};

function toDate(value: Date | number | string | null | undefined) {
	if (value == null) return null;
	const date = new Date(
		typeof value === "number" && value < 1_000_000_000_000
			? value * 1000
			: value,
	);
	return Number.isNaN(date.getTime()) ? null : date;
}

function toWebhookDate(value: number) {
	return new Date(value < 1_000_000_000_000 ? value * 1000 : value);
}

export async function syncCreemWebhook(
	db: DatabaseClient,
	event: CreemEvent,
	checkoutId?: string,
) {
	const referenceId = event.metadata?.referenceId;
	let subscription = await db.query.creemSubscription.findFirst({
		where: eq(creemSubscription.creemSubscriptionId, event.id),
	});
	if (!subscription && checkoutId) {
		subscription = await db.query.creemSubscription.findFirst({
			where: eq(creemSubscription.checkoutId, checkoutId),
		});
	}
	if (
		!subscription ||
		(typeof referenceId === "string" &&
			subscription.referenceId !== referenceId)
	)
		return null;

	const previousTime = subscription.lastWebhookCreatedAt?.getTime() ?? 0;
	const eventTime = toWebhookDate(event.webhookCreatedAt);
	let state: SavedWebhookState;
	if (eventTime.getTime() <= previousTime && subscription.lastWebhookState) {
		state = subscription.lastWebhookState as SavedWebhookState;
	} else {
		const periodStart = toDate(event.current_period_start_date);
		const periodEnd = toDate(event.current_period_end_date);
		const orderId =
			typeof event.order === "string" ? event.order : event.order?.id;
		state = {
			productId: event.product.id,
			status: event.status.toLowerCase(),
			creemCustomerId: event.customer?.id ?? subscription.creemCustomerId,
			creemSubscriptionId: event.id,
			creemOrderId: orderId ?? subscription.creemOrderId,
			periodStart:
				periodStart?.toISOString() ??
				subscription.periodStart?.toISOString() ??
				null,
			periodEnd:
				periodEnd?.toISOString() ??
				subscription.periodEnd?.toISOString() ??
				null,
			cancelAtPeriodEnd:
				event.cancel_at_period_end ?? event.status === "scheduled_cancel",
			lastWebhookId: event.webhookId,
			lastWebhookCreatedAt: eventTime.toISOString(),
		};
	}

	await db
		.update(creemSubscription)
		.set({
			productId: state.productId,
			status: state.status,
			creemCustomerId: state.creemCustomerId,
			creemSubscriptionId: state.creemSubscriptionId,
			creemOrderId: state.creemOrderId,
			periodStart: state.periodStart ? new Date(state.periodStart) : null,
			periodEnd: state.periodEnd ? new Date(state.periodEnd) : null,
			cancelAtPeriodEnd: state.cancelAtPeriodEnd,
			lastWebhookId: state.lastWebhookId,
			lastWebhookCreatedAt: new Date(state.lastWebhookCreatedAt),
			lastWebhookState: state,
		})
		.where(
			and(
				eq(creemSubscription.id, subscription.id),
				subscription.lastWebhookId
					? eq(creemSubscription.lastWebhookId, subscription.lastWebhookId)
					: isNull(creemSubscription.lastWebhookId),
			),
		);
	if (state.creemCustomerId) {
		await db
			.update(user)
			.set({ creemCustomerId: state.creemCustomerId })
			.where(eq(user.id, subscription.referenceId));
	}
	await db.transaction(async (tx) => {
		await tx.execute(
			sql`select pg_advisory_xact_lock(hashtextextended(${subscription.referenceId}, 0))`,
		);
		await tx
			.delete(creemSubscription)
			.where(
				and(
					eq(creemSubscription.referenceId, subscription.referenceId),
					eq(creemSubscription.status, "pending"),
					isNull(creemSubscription.creemSubscriptionId),
				),
			);
	});
	return {
		userId: subscription.referenceId,
		accepted: state.lastWebhookId === event.webhookId,
	};
}

type CompletedCheckout = {
	id: string;
	status: string;
	requestId?: string;
	product: { id: string } | string;
	customer?: { id: string } | string | null;
	metadata?: Record<string, unknown> | null;
	order?: { id: string } | string | null;
	subscription?:
		| {
				id: string;
				status: string;
				product: { id: string } | string;
				customer: { id: string } | string;
				metadata?: Record<string, unknown> | null;
				currentPeriodStartDate?: Date | null;
				currentPeriodEndDate?: Date | null;
				cancelAtPeriodEnd?: boolean;
		  }
		| string;
};

export async function syncCreemCheckout(
	db: DatabaseClient,
	event: { id: string; webhookId: string; webhookCreatedAt: number },
	retrieveCheckout: (id: string) => Promise<CompletedCheckout>,
	retrieveSubscription?: (
		id: string,
	) => Promise<NonNullable<CompletedCheckout["subscription"]>>,
) {
	const pending = await db.query.creemSubscription.findFirst({
		where: eq(creemSubscription.checkoutId, event.id),
	});
	if (!pending || pending.creemSubscriptionId) return null;

	const checkout = await retrieveCheckout(event.id);
	const productId =
		typeof checkout.product === "string"
			? checkout.product
			: checkout.product.id;
	const referenceId = checkout.metadata?.referenceId;
	if (
		checkout.id !== pending.checkoutId ||
		checkout.status.toLowerCase() !== "completed" ||
		(checkout.requestId && checkout.requestId !== pending.id) ||
		referenceId !== pending.referenceId ||
		!checkout.subscription
	)
		return null;

	const subscription =
		typeof checkout.subscription === "string"
			? await retrieveSubscription?.(checkout.subscription)
			: checkout.subscription;
	if (!subscription || typeof subscription === "string") return null;
	const subscriptionProductId =
		typeof subscription.product === "string"
			? subscription.product
			: subscription.product.id;
	const customer = subscription.customer ?? checkout.customer;
	const customerId = typeof customer === "string" ? customer : customer?.id;
	if (subscriptionProductId !== productId || !customerId) return null;

	const eventData = {
		webhookId: event.webhookId,
		webhookCreatedAt: event.webhookCreatedAt,
		id: subscription.id,
		status: subscription.status,
		product: { id: subscriptionProductId },
		customer: { id: customerId },
		metadata: subscription.metadata ?? checkout.metadata,
		current_period_start_date: subscription.currentPeriodStartDate,
		current_period_end_date: subscription.currentPeriodEndDate,
		cancel_at_period_end: subscription.cancelAtPeriodEnd,
		order: checkout.order,
	};
	return syncCreemWebhook(db, eventData, event.id);
}

export async function syncCreemRefund(
	db: DatabaseClient,
	event: {
		status: string;
		subscription?: { id: string } | string | null;
		webhookId: string;
		webhookCreatedAt: number;
	},
) {
	if (event.status !== "succeeded" || !event.subscription) return null;
	const subscriptionId =
		typeof event.subscription === "string"
			? event.subscription
			: event.subscription.id;
	const subscription = await db.query.creemSubscription.findFirst({
		where: eq(creemSubscription.creemSubscriptionId, subscriptionId),
	});
	if (!subscription) return null;

	return syncCreemWebhook(db, {
		webhookId: event.webhookId,
		webhookCreatedAt: event.webhookCreatedAt,
		id: subscriptionId,
		status: "refunded",
		product: { id: subscription.productId },
		customer: subscription.creemCustomerId
			? { id: subscription.creemCustomerId }
			: null,
		metadata: { referenceId: subscription.referenceId },
		current_period_start_date: subscription.periodStart,
		current_period_end_date: new Date(event.webhookCreatedAt),
		cancel_at_period_end: false,
	});
}
