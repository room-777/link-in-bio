import { retrieveSubscription } from "@grabbin/auth/creem-server";
import type { DatabaseClient } from "@grabbin/db";
import { creemSubscription } from "@grabbin/db/schema/index";
import { and, eq, inArray, isNull, lte } from "drizzle-orm";
import type { AppEnv } from "../types";
import { reconcileUserPageLifecycle } from "./page-lifecycle.service";

export async function reconcileExpiredSubscriptions({
	db,
	env,
	now = new Date(),
	fetchSubscription = retrieveSubscription,
}: {
	db: DatabaseClient;
	env: Pick<
		AppEnv["Bindings"],
		| "CREEM_API_KEY"
		| "CREEM_TEST_MODE"
		| "CREEM_PRO_MONTHLY_PRODUCT_ID"
		| "CREEM_PRO_YEARLY_PRODUCT_ID"
	>;
	now?: Date;
	fetchSubscription?: typeof retrieveSubscription;
}) {
	const proProductIds = [
		env.CREEM_PRO_MONTHLY_PRODUCT_ID,
		env.CREEM_PRO_YEARLY_PRODUCT_ID,
	].filter(Boolean);
	if (proProductIds.length === 0) return new Set<string>();

	const candidates = await db.query.creemSubscription.findMany({
		where: and(
			inArray(creemSubscription.productId, proProductIds),
			lte(creemSubscription.periodEnd, now),
		),
	});
	const skippedUserIds = new Set<string>();
	for (const candidate of candidates) {
		if (!candidate.creemSubscriptionId) continue;
		const priorWebhookId = candidate.lastWebhookId;
		try {
			const current = await fetchSubscription(
				{
					apiKey: env.CREEM_API_KEY,
					testMode: env.CREEM_TEST_MODE === "true",
				},
				candidate.creemSubscriptionId,
			);
			const status = current.status.toLowerCase();
			await db
				.update(creemSubscription)
				.set({
					status,
					periodStart: current.currentPeriodStartDate,
					periodEnd: current.currentPeriodEndDate,
					cancelAtPeriodEnd: status === "scheduled_cancel",
				})
				.where(
					and(
						eq(creemSubscription.id, candidate.id),
						priorWebhookId
							? eq(creemSubscription.lastWebhookId, priorWebhookId)
							: isNull(creemSubscription.lastWebhookId),
					),
				);
			await reconcileUserPageLifecycle({
				db,
				userId: candidate.referenceId,
				proProductIds,
				now,
			});
		} catch {
			console.warn("[creem] subscription reconciliation will retry", {
				subscriptionId: candidate.creemSubscriptionId,
			});
			skippedUserIds.add(candidate.referenceId);
		}
	}
	return skippedUserIds;
}
