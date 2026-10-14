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
	new Set(["active", "trialing", "scheduled_cancel", "canceled"]);

export type PlanTier = "free" | "pro";

export type PlanSubscription = {
	subscriptionId?: string | null;
	productId: string;
	status: SubscriptionStatus | null;
	periodEnd: Date | null;
	cancelAtPeriodEnd: boolean | null;
};

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
	const status = subscription?.status ?? null;
	const periodActive = subscription?.periodEnd
		? subscription.periodEnd > now
		: status !== "canceled" &&
			status !== "scheduled_cancel" &&
			status !== "expired";
	const hasAccess =
		!!status && periodActive && PRO_SUBSCRIPTION_STATUSES.has(status);

	return {
		tier: hasAccess ? ("pro" as const) : ("free" as const),
		pageLimit: hasAccess ? PRO_PAGE_LIMIT : FREE_PAGE_LIMIT,
		hasAccess,
		status: subscription?.status ?? null,
		subscriptionId: subscription?.subscriptionId ?? null,
		productId: subscription?.productId ?? null,
		periodEnd: subscription?.periodEnd ?? null,
		cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
	};
}
