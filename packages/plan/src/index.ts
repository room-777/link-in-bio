export const FREE_PAGE_LIMIT = 1;
export const PRO_PAGE_LIMIT = 3;
export const PAGE_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

export const PRO_SUBSCRIPTION_STATUSES = new Set([
	"active",
	"trialing",
	"paid",
	"scheduled_cancel",
	"canceled",
]);

export type PlanTier = "free" | "pro";

export type PlanSubscription = {
	subscriptionId?: string | null;
	productId: string;
	status: string | null;
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
	const status = subscription?.status?.toLowerCase() ?? "";
	const periodActive = subscription?.periodEnd
		? subscription.periodEnd > now
		: !["canceled", "scheduled_cancel", "expired"].includes(status);
	const hasAccess =
		!!subscription && periodActive && PRO_SUBSCRIPTION_STATUSES.has(status);

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
