import type { DatabaseClient } from "@grabbin/db";
import { creemRefund, creemSubscription, user } from "@grabbin/db/schema/index";
import {
	deriveCancelAtPeriodEnd,
	parseSubscriptionStatus,
	refundRevokesAccess,
	type SubscriptionStatus,
} from "@grabbin/plan";
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
	status: SubscriptionStatus;
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
		const status = parseSubscriptionStatus(event.status);
		const orderId =
			typeof event.order === "string" ? event.order : event.order?.id;
		state = {
			productId: event.product.id,
			status,
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
			cancelAtPeriodEnd: deriveCancelAtPeriodEnd(
				status,
				event.cancel_at_period_end,
			),
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
					isNull(creemSubscription.status),
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
	product:
		| {
				id: string;
				name: string;
				price: number;
				currency: string;
				taxMode: "inclusive" | "exclusive";
		  }
		| string;
	units?: number;
	customer?: { id: string } | string | null;
	metadata?: Record<string, unknown> | null;
	order?:
		| {
				id: string;
				product: string;
				transaction?: string | null;
				amount?: number;
				discountAmount?: number;
				taxAmount?: number;
				amountPaid?: number;
				currency: string;
				status: string;
		  }
		| string
		| null;
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
	if (!pending) return null;

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
	const order = typeof checkout.order === "object" ? checkout.order : null;
	const product =
		typeof checkout.product === "object" ? checkout.product : null;
	const units = checkout.units;
	const amount = order?.amount;
	const discountAmount = order?.discountAmount;
	const amountPaid = order?.amountPaid;
	const currency = order?.currency;
	const grossAmount =
		product && typeof units === "number" && Number.isSafeInteger(units)
			? product.price * units
			: Number.NaN;
	const taxAmount = order?.taxAmount;
	const validTaxAmount =
		(taxAmount == null && product?.taxMode === "exclusive") ||
		(typeof taxAmount === "number" &&
			Number.isSafeInteger(taxAmount) &&
			taxAmount >= 0);
	const valueAmount =
		product?.taxMode === "inclusive" && validTaxAmount
			? amount === undefined
				? Number.NaN
				: amount - (taxAmount ?? 0)
			: product?.taxMode === "exclusive"
				? (amount ?? Number.NaN)
				: Number.NaN;
	const validPaidAmount =
		product?.taxMode === "inclusive"
			? amountPaid === amount
			: product?.taxMode === "exclusive" &&
				typeof amountPaid === "number" &&
				amountPaid >= (amount ?? Number.NaN) &&
				(taxAmount == null ||
					amountPaid === (amount ?? Number.NaN) + taxAmount);
	const validDiscount =
		discountAmount === undefined ||
		(Number.isSafeInteger(discountAmount) &&
			discountAmount >= 0 &&
			discountAmount === grossAmount - (amount ?? Number.NaN));
	const purchase =
		order?.status.toLowerCase() === "paid" &&
		order.product === product?.id &&
		product?.name &&
		Number.isSafeInteger(product.price) &&
		product.price > 0 &&
		typeof units === "number" &&
		Number.isSafeInteger(units) &&
		units > 0 &&
		typeof amount === "number" &&
		Number.isSafeInteger(amount) &&
		amount > 0 &&
		Number.isSafeInteger(grossAmount) &&
		amount <= grossAmount &&
		amount % units === 0 &&
		validDiscount &&
		typeof amountPaid === "number" &&
		Number.isSafeInteger(amountPaid) &&
		validTaxAmount &&
		amountPaid >= amount &&
		validPaidAmount &&
		Number.isSafeInteger(valueAmount) &&
		valueAmount > 0 &&
		valueAmount % units === 0 &&
		currency === product.currency &&
		/^[A-Z]{3}$/.test(currency)
			? {
					transaction_id: order.transaction ?? "",
					value: valueAmount / 100,
					currency,
					items: [
						{
							item_id: product.id,
							item_name: product.name,
							price: valueAmount / units / 100,
							quantity: units,
						},
					],
				}
			: null;
	const validPurchase = purchase?.transaction_id ? purchase : null;

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
	const synced = await syncCreemWebhook(db, eventData, event.id);
	return synced ? { ...synced, purchase: validPurchase } : null;
}

type PaidSubscriptionEvent = CreemEvent & {
	product: {
		id: string;
		name: string;
		price: number;
		currency: string;
		tax_mode: "inclusive" | "exclusive";
	};
	customer: { id: string };
	items?: Array<{ product_id?: string; units?: number }>;
	last_transaction_id?: string;
};

type CreemTransaction = {
	id: string;
	status: string;
	type: string;
	amount: number;
	amountPaid?: number | null;
	discountAmount?: number | null;
	taxAmount?: number | null;
	currency: string;
	order?: string | null;
	subscription?: string | null;
	customer?: string | null;
};

/**
 * Synchronizes a paid subscription and returns a purchase only when Creem
 * confirms the exact invoice transaction and its pre-tax line-item amount.
 */
export async function syncCreemSubscriptionPaid(
	db: DatabaseClient,
	event: PaidSubscriptionEvent,
	retrieveTransaction: (id: string) => Promise<CreemTransaction>,
) {
	const synced = await syncCreemWebhook(db, event);
	if (!synced) return null;
	if (!event.last_transaction_id) return { ...synced, purchase: null };

	const transaction = await retrieveTransaction(event.last_transaction_id);
	const item =
		event.items?.length === 1 && event.items[0]?.product_id === event.product.id
			? event.items[0]
			: event.items?.length
				? null
				: { product_id: event.product.id, units: 1 };
	// Grabbin sells one Pro seat per checkout and sets units explicitly to 1.
	// Creem may omit items from subscription webhooks, so use that fixed unit
	// only when no item data was sent; malformed or multiple items are skipped.
	const units = item?.units ?? 1;
	const grossAmount =
		typeof units === "number" && Number.isSafeInteger(units)
			? event.product.price * units
			: Number.NaN;
	const taxAmount = transaction.taxAmount;
	const validTaxAmount =
		(taxAmount == null && event.product.tax_mode === "exclusive") ||
		(typeof taxAmount === "number" &&
			Number.isSafeInteger(taxAmount) &&
			taxAmount >= 0);
	const valueAmount =
		event.product.tax_mode === "inclusive" && validTaxAmount
			? transaction.amount - (taxAmount ?? 0)
			: event.product.tax_mode === "exclusive"
				? transaction.amount
				: Number.NaN;
	const validPaidAmount =
		transaction.amountPaid == null
			? true
			: event.product.tax_mode === "inclusive"
				? transaction.amountPaid === transaction.amount
				: event.product.tax_mode === "exclusive" &&
					transaction.amountPaid >= transaction.amount &&
					(taxAmount == null ||
						transaction.amountPaid === transaction.amount + taxAmount);
	const discountAmount = transaction.discountAmount;
	const validDiscount =
		discountAmount == null ||
		(Number.isSafeInteger(discountAmount) &&
			discountAmount >= 0 &&
			discountAmount === grossAmount - transaction.amount);
	const purchase =
		transaction.id === event.last_transaction_id &&
		transaction.status.toLowerCase() === "paid" &&
		transaction.type === "invoice" &&
		transaction.subscription === event.id &&
		transaction.customer === event.customer.id &&
		typeof transaction.order === "string" &&
		/^[A-Z]{3}$/.test(transaction.currency) &&
		transaction.currency === event.product.currency &&
		event.product.name.length > 0 &&
		Number.isSafeInteger(event.product.price) &&
		event.product.price > 0 &&
		item !== null &&
		typeof units === "number" &&
		Number.isSafeInteger(units) &&
		units > 0 &&
		Number.isSafeInteger(grossAmount) &&
		Number.isSafeInteger(transaction.amount) &&
		transaction.amount > 0 &&
		transaction.amount <= grossAmount &&
		transaction.amount % units === 0 &&
		validDiscount &&
		validTaxAmount &&
		validPaidAmount &&
		Number.isSafeInteger(valueAmount) &&
		valueAmount > 0 &&
		valueAmount % units === 0
			? {
					transaction_id: transaction.id,
					value: valueAmount / 100,
					currency: transaction.currency,
					items: [
						{
							item_id: event.product.id,
							item_name: event.product.name,
							price: valueAmount / units / 100,
							quantity: units,
						},
					],
				}
			: null;
	return { ...synced, purchase };
}

type RevokingEvent = {
	subscription?: { id: string } | string | null;
	webhookId: string;
	webhookCreatedAt: number;
};

/** A full refund or a chargeback ends Pro right away (Creem has no status for it). */
async function revokeForPaymentReversal(
	db: DatabaseClient,
	event: RevokingEvent,
) {
	if (!event.subscription) return null;
	const subscriptionId =
		typeof event.subscription === "string"
			? event.subscription
			: event.subscription.id;
	const subscription = await db.query.creemSubscription.findFirst({
		where: eq(creemSubscription.creemSubscriptionId, subscriptionId),
	});
	if (!subscription) return null;

	// A reversal always wins, even when its webhook is older than the last
	// one applied (e.g. an earlier partial refund delivered late).
	const eventTime = toWebhookDate(event.webhookCreatedAt).getTime();
	const lastTime = subscription.lastWebhookCreatedAt?.getTime() ?? 0;
	return syncCreemWebhook(db, {
		webhookId: event.webhookId,
		webhookCreatedAt: Math.max(eventTime, lastTime + 1),
		id: subscriptionId,
		status: "expired",
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

type RefundTransaction = {
	id?: string | null;
	amount_paid?: number | null;
	refunded_amount?: number | null;
};

/**
 * Records a succeeded refund once (keyed by refund id) and returns the total
 * refunded so far on its transaction. Each statement commits on its own, so
 * two partial refunds landing at once still see each other in the sum.
 */
async function recordRefund(
	db: DatabaseClient,
	refund: {
		id: string;
		transactionId: string;
		subscriptionId: string | null;
		amount: number;
	},
) {
	await db
		.insert(creemRefund)
		.values({
			id: refund.id,
			transactionId: refund.transactionId,
			creemSubscriptionId: refund.subscriptionId,
			amount: refund.amount,
		})
		.onConflictDoNothing({ target: creemRefund.id });
	const [row] = await db
		.select({ total: sql<string>`coalesce(sum(${creemRefund.amount}), 0)` })
		.from(creemRefund)
		.where(eq(creemRefund.transactionId, refund.transactionId));
	return Number(row?.total ?? 0);
}

export async function syncCreemRefund(
	db: DatabaseClient,
	event: RevokingEvent & {
		id?: string | null;
		status: string;
		refund_amount?: number | null;
		transaction?: RefundTransaction | string | null;
	},
) {
	if (event.status !== "succeeded") return null;
	const transaction =
		typeof event.transaction === "object" ? event.transaction : null;
	const transactionId =
		typeof event.transaction === "string"
			? event.transaction
			: (transaction?.id ?? null);
	const amountPaid = transaction?.amount_paid;
	// Creem's embedded transaction is a snapshot from before this refund, so
	// refunded_amount may be null or stale; our ledger is the running total.
	let refundedAmount = transaction?.refunded_amount ?? event.refund_amount;
	if (event.id && transactionId && event.refund_amount != null) {
		const subscriptionId =
			typeof event.subscription === "string"
				? event.subscription
				: (event.subscription?.id ?? null);
		const total = await recordRefund(db, {
			id: event.id,
			transactionId,
			subscriptionId,
			amount: event.refund_amount,
		});
		refundedAmount = Math.max(total, transaction?.refunded_amount ?? 0);
	}
	if (
		!refundRevokesAccess({
			status: event.status,
			refundedAmount,
			amountPaid,
		})
	)
		return null;
	return revokeForPaymentReversal(db, event);
}

export async function syncCreemDispute(
	db: DatabaseClient,
	event: RevokingEvent,
) {
	return revokeForPaymentReversal(db, event);
}
