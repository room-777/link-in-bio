import type { DatabaseClient } from "@grabbin/db";
import { creemSubscription } from "@grabbin/db/schema/index";
import { needsCancelOnAccountDeletion } from "@grabbin/plan";
import { eq } from "drizzle-orm";
import { createCreemClient } from "./creem-server";

type CreemConfig = { apiKey: string; testMode: boolean };
type CancelClient = {
	subscriptions: {
		cancel: (
			id: string,
			options: { mode: "immediate" },
		) => Promise<{ status: string }>;
	};
};

/** Cancel every still-billing Creem subscription right away. Throws to block deletion. */
export async function cancelSubscriptionsBeforeAccountDeletion(
	db: DatabaseClient,
	userId: string,
	config: CreemConfig,
	client: CancelClient = createCreemClient(config) as unknown as CancelClient,
) {
	const subscriptions = await db.query.creemSubscription.findMany({
		where: eq(creemSubscription.referenceId, userId),
	});
	for (const subscription of subscriptions) {
		if (!subscription.creemSubscriptionId) continue;
		if (!needsCancelOnAccountDeletion(subscription)) continue;
		try {
			await client.subscriptions.cancel(subscription.creemSubscriptionId, {
				mode: "immediate",
			});
		} catch (error) {
			console.warn("[creem] account deletion blocked: cancel failed", {
				subscriptionId: subscription.creemSubscriptionId,
			});
			throw error;
		}
	}
}
