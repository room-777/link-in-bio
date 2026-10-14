import type { SubscriptionStatus } from "@creem_io/webhook-types";

export type { SubscriptionStatus };

export const FREE_PAGE_LIMIT = 1;
export const PRO_PAGE_LIMIT = 3;
export const PAGE_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

const SUBSCRIPTION_STATUSES = {
	active: true,
	canceled: true,
	expired: true,
	past_due: true,
	unpaid: true,
	paused: true,
	trialing: true,
	scheduled_cancel: true,
} satisfies Record<SubscriptionStatus, true>;

export function parseSubscriptionStatus(value: string): SubscriptionStatus {
	if (Object.hasOwn(SUBSCRIPTION_STATUSES, value))
		return value as SubscriptionStatus;
	throw new Error(`Unknown Creem subscription status: ${value}`);
}

export const PRO_SUBSCRIPTION_STATUSES: ReadonlySet<SubscriptionStatus> =
	new Set([
		"active",
		"trialing",
		"scheduled_cancel",
		"canceled",
		"past_due",
		"unpaid",
		"paused",
	]);

/**
 * Pro for these statuses only lasts through a period already on record:
 * payment problems honor what was paid, and a scheduled cancel ends at it.
 * Normal flows always store a periodEnd, so a missing one is corrupt data.
 */
const PERIOD_END_REQUIRED_STATUSES: ReadonlySet<SubscriptionStatus> = new Set([
	"past_due",
	"unpaid",
	"paused",
	"scheduled_cancel",
]);

export type PlanTier = "free" | "pro";

export type PlanSubscription = {
	subscriptionId?: string | null;
	productId: string;
	status: SubscriptionStatus | null;
	periodEnd: Date | null;
	cancelAtPeriodEnd: boolean | null;
};

type StatusFields = {
	subscriptionId?: string | null;
	status: SubscriptionStatus | null;
	periodEnd: Date | null;
	cancelAtPeriodEnd?: boolean | null;
};

/** Creem's cancel flag wins; otherwise a scheduled_cancel status implies it. */
export function deriveCancelAtPeriodEnd(
	status: SubscriptionStatus,
	cancelAtPeriodEnd?: boolean | null,
) {
	return cancelAtPeriodEnd ?? status === "scheduled_cancel";
}

export function isCancellationScheduled(
	subscription: Pick<StatusFields, "status" | "cancelAtPeriodEnd">,
) {
	return (
		!!subscription.cancelAtPeriodEnd ||
		subscription.status === "scheduled_cancel"
	);
}

/** Without a period end, only canceled and expired count as ended. */
export function isPeriodEnded(
	subscription: Pick<StatusFields, "status" | "periodEnd">,
	now = new Date(),
) {
	if (subscription.periodEnd) return subscription.periodEnd <= now;
	return (
		subscription.status === "canceled" || subscription.status === "expired"
	);
}

/** Pro access to Creem's subscription is what Creem still bills or honors. */
export function grantsProAccess(subscription: StatusFields, now = new Date()) {
	const { status } = subscription;
	if (!status || !PRO_SUBSCRIPTION_STATUSES.has(status)) return false;
	if (PERIOD_END_REQUIRED_STATUSES.has(status) && !subscription.periodEnd) {
		// Invalid state: log only the id, never other subscription data.
		console.warn(
			`[plan] ${status} subscription without periodEnd; denying Pro`,
			{ subscriptionId: subscription.subscriptionId ?? null },
		);
		return false;
	}
	return !isPeriodEnded(subscription, now);
}

/**
 * Different question from Pro access: a past_due/unpaid subscription still
 * blocks a second checkout, and an open checkout (no Creem id) never does.
 */
export function blocksNewCheckout(
	subscription: StatusFields & { creemSubscriptionId: string | null },
	now = new Date(),
) {
	if (!subscription.creemSubscriptionId) return false;
	const periodOpen = !subscription.periodEnd || subscription.periodEnd > now;
	if (subscription.status === "canceled")
		return !!subscription.periodEnd && periodOpen;
	return (
		(subscription.status === "active" ||
			subscription.status === "trialing" ||
			subscription.status === "scheduled_cancel" ||
			subscription.status === "past_due" ||
			subscription.status === "unpaid") &&
		periodOpen
	);
}

/** Open checkout row: saved before Creem created a subscription. */
export function isOpenCheckout(subscription: {
	status: SubscriptionStatus | null;
	creemSubscriptionId: string | null;
	checkoutId: string | null;
}) {
	return (
		subscription.status === null &&
		!subscription.creemSubscriptionId &&
		!!subscription.checkoutId
	);
}

export function canScheduleCancellation(
	subscription: Pick<StatusFields, "status">,
) {
	return subscription.status === "active" || subscription.status === "trialing";
}

export function graceEndsAt(
	periodEnd: Date | null,
	now = new Date(),
	fallback?: Date | null,
) {
	return periodEnd
		? new Date(periodEnd.getTime() + PAGE_GRACE_PERIOD_MS)
		: (fallback ?? new Date(now.getTime() + PAGE_GRACE_PERIOD_MS));
}

export function getPlanAccess(
	subscriptions: readonly PlanSubscription[],
	proProductIds: readonly string[],
	now = new Date(),
) {
	const subscription = [...subscriptions]
		.filter((item) => proProductIds.includes(item.productId))
		.sort(
			(a, b) => (b.periodEnd?.getTime() ?? 0) - (a.periodEnd?.getTime() ?? 0),
		)[0];
	const hasAccess = !!subscription && grantsProAccess(subscription, now);

	return {
		tier: hasAccess ? ("pro" as const) : ("free" as const),
		pageLimit: hasAccess ? PRO_PAGE_LIMIT : FREE_PAGE_LIMIT,
		hasAccess,
		/** Had a Pro subscription that no longer grants access. */
		lapsedFromPro: !!subscription && !hasAccess,
		cancellationScheduled:
			!!subscription && isCancellationScheduled(subscription),
		periodEnded: !!subscription && isPeriodEnded(subscription, now),
		status: subscription?.status ?? null,
		subscriptionId: subscription?.subscriptionId ?? null,
		productId: subscription?.productId ?? null,
		periodEnd: subscription?.periodEnd ?? null,
		cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
	};
}
