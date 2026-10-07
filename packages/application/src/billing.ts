import type { DatabaseClient } from "@grabbin/db";
import { creemSubscription } from "@grabbin/db/schema/index";
import { getPlanAccess } from "@grabbin/plan";
import { eq } from "drizzle-orm";

export async function getAccountPlan({
	db,
	userId,
	proProductIds,
	now = new Date(),
}: {
	db: Pick<DatabaseClient, "query">;
	userId: string;
	proProductIds: readonly string[];
	now?: Date;
}) {
	const subscriptions = await db.query.creemSubscription.findMany({
		where: eq(creemSubscription.referenceId, userId),
	});
	return getPlanAccess(
		subscriptions.map((subscription) => ({
			subscriptionId: subscription.creemSubscriptionId,
			productId: subscription.productId,
			status: subscription.status,
			periodEnd: subscription.periodEnd,
			cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
		})),
		proProductIds,
		now,
	);
}
