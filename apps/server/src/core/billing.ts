import type { DatabaseClient } from "@db/index";
import {
	creemSubscription,
	pages,
} from "@db/schema";
import { PRO_PRODUCT_IDS } from "@grabbin/plan";
import {
	and,
	eq,
	isNotNull,
} from "drizzle-orm";

const ACCESS_STATUSES = new Set([
	"active",
	"trialing",
	"paid",
]);

type Subscription = Pick<
	typeof creemSubscription.$inferSelect,
	| "status"
	| "productId"
	| "periodStart"
	| "periodEnd"
	| "cancelAtPeriodEnd"
>;

export type BillingEntitlement = {
	tier: "free" | "pro";
	hasAccess: boolean;
	productId: string | null;
	periodEnd: Date | null;
};

export type PlanAccess =
	BillingEntitlement & {
		gracePeriod: boolean;
	};

export type BillingStatusResponse =
	| {
			status: "none";
			hasAccess: false;
	  }
	| {
			status: string;
			hasAccess: boolean;
			productId: string;
			periodStart: string | null;
			periodEnd: string | null;
			cancelAtPeriodEnd: boolean;
	  };

const periodTime = (
	date: Date | null,
) =>
	date?.getTime() ??
	Number.NEGATIVE_INFINITY;

const latestSubscription = <
	T extends Subscription,
>(
	subscriptions: T[],
) =>
	[...subscriptions].sort(
		(a, b) =>
			periodTime(b.periodEnd) -
			periodTime(a.periodEnd),
	)[0];

export const buildPlanAccess = (
	subscriptions: Subscription[],
	now = new Date(),
): BillingEntitlement => {
	const subscription =
		latestSubscription(subscriptions);
	if (
		!subscription ||
		!PRO_PRODUCT_IDS.has(
			subscription.productId,
		)
	)
		return {
			tier: "free",
			hasAccess: false,
			productId:
				subscription?.productId ?? null,
			periodEnd:
				subscription?.periodEnd ?? null,
		};

	const status =
		subscription.status.toLowerCase();
	const periodActive =
		subscription.periodEnd === null ||
		subscription.periodEnd > now;
	const hasAccess =
		periodActive &&
		(ACCESS_STATUSES.has(status) ||
			(status === "canceled" &&
				subscription.periodEnd !==
					null));

	return {
		tier: hasAccess ? "pro" : "free",
		hasAccess,
		productId: subscription.productId,
		periodEnd: subscription.periodEnd,
	};
};

export const getPlanAccess = async ({
	db,
	userId,
	now = new Date(),
}: {
	db: DatabaseClient;
	userId: string;
	now?: Date;
}): Promise<PlanAccess> => {
	const subscriptionQuery = (
		db.query as unknown as {
			creemSubscription?: {
				findMany?: (
					config: unknown,
				) => Promise<Subscription[]>;
			};
		}
	).creemSubscription;
	const subscriptions =
		typeof subscriptionQuery?.findMany ===
		"function"
			? await subscriptionQuery.findMany(
					{
						where: eq(
							creemSubscription.referenceId,
							userId,
						),
					},
				)
			: [];
	const entitlement = buildPlanAccess(
		subscriptions,
		now,
	);
	const pageQuery = (
		db.query as unknown as {
			pages?: {
				findMany?: (
					config: unknown,
				) => Promise<unknown[]>;
			};
		}
	).pages;
	const pendingPages =
		typeof pageQuery?.findMany ===
		"function"
			? await pageQuery.findMany({
					where: and(
						eq(pages.userId, userId),
						isNotNull(
							pages.deletionScheduledAt,
						),
					),
					columns: { id: true },
				})
			: [];
	const expiredProPeriod =
		entitlement.tier === "free" &&
		entitlement.productId !== null &&
		PRO_PRODUCT_IDS.has(
			entitlement.productId,
		) &&
		entitlement.periodEnd !== null &&
		entitlement.periodEnd <= now;

	return {
		...entitlement,
		gracePeriod:
			expiredProPeriod &&
			pendingPages.length > 0,
	};
};

export const buildBillingStatus = (
	subscriptions: Subscription[],
	now = new Date(),
): BillingStatusResponse => {
	const subscription =
		latestSubscription(subscriptions);

	if (!subscription) {
		return {
			status: "none",
			hasAccess: false,
		};
	}

	const status =
		subscription.status.toLowerCase();
	const periodActive =
		subscription.periodEnd === null ||
		subscription.periodEnd > now;
	const canceledWithinPeriod =
		status === "canceled" &&
		subscription.periodEnd !== null &&
		periodActive;

	return {
		status,
		hasAccess:
			periodActive &&
			(ACCESS_STATUSES.has(status) ||
				canceledWithinPeriod),
		productId: subscription.productId,
		periodStart:
			subscription.periodStart?.toISOString() ??
			null,
		periodEnd:
			subscription.periodEnd?.toISOString() ??
			null,
		cancelAtPeriodEnd:
			subscription.cancelAtPeriodEnd,
	};
};
