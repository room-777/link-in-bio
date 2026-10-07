import { getAccountPlan } from "@grabbin/application/billing";
import type { createCreemClient } from "@grabbin/auth/creem-server";
import { syncCreemCheckout } from "@grabbin/auth/creem-webhook";
import type { DatabaseClient } from "@grabbin/db";
import { creemSubscription } from "@grabbin/db/schema/index";
import { eq, sql } from "drizzle-orm";

type CreemClient = ReturnType<typeof createCreemClient>;
type CheckoutTransactionResult =
	| { kind: "url"; url: string }
	| {
			kind: "error";
			error:
				| "SUBSCRIPTION_EXISTS"
				| "CHECKOUT_IN_PROGRESS"
				| "CHECKOUT_UNAVAILABLE";
	  }
	| { kind: "completed"; checkoutId: string };

export async function createOrResumeProCheckout({
	db,
	creem,
	userId,
	email,
	productId,
	successUrl,
}: {
	db: DatabaseClient;
	creem: CreemClient;
	userId: string;
	email: string;
	productId: string;
	successUrl: string;
}): Promise<
	| { url: string }
	| {
			error:
				| "SUBSCRIPTION_EXISTS"
				| "CHECKOUT_IN_PROGRESS"
				| "CHECKOUT_PROCESSING"
				| "CHECKOUT_UNAVAILABLE";
	  }
> {
	const checkoutRequestId = crypto.randomUUID();
	const now = new Date();
	const result: CheckoutTransactionResult = await db.transaction(
		async (tx): Promise<CheckoutTransactionResult> => {
			await tx.execute(
				sql`select pg_advisory_xact_lock(hashtextextended(${userId}, 0))`,
			);
			const subscriptions = await tx.query.creemSubscription.findMany({
				where: eq(creemSubscription.referenceId, userId),
			});
			const hasCurrentSubscription = subscriptions.some((subscription) => {
				const status = subscription.status?.toLowerCase();
				if (!subscription.creemSubscriptionId) return false;
				if (status === "canceled")
					return Boolean(
						subscription.periodEnd && subscription.periodEnd > now,
					);
				return (
					[
						"pending",
						"active",
						"trialing",
						"paid",
						"scheduled_cancel",
						"past_due",
						"unpaid",
					].includes(status ?? "") &&
					(!subscription.periodEnd || subscription.periodEnd > now)
				);
			});
			if (hasCurrentSubscription)
				return { kind: "error", error: "SUBSCRIPTION_EXISTS" };

			const pendingCheckout = subscriptions.find(
				(subscription) =>
					subscription.status === "pending" &&
					!subscription.creemSubscriptionId &&
					subscription.checkoutId,
			);
			if (pendingCheckout?.checkoutId) {
				if (pendingCheckout.productId !== productId) {
					return { kind: "error", error: "CHECKOUT_IN_PROGRESS" };
				}
				try {
					const checkout = await creem.checkouts.retrieve(
						pendingCheckout.checkoutId,
					);
					if (!checkout)
						return { kind: "error", error: "CHECKOUT_UNAVAILABLE" };
					if (
						checkout.status === "pending" ||
						checkout.status === "processing"
					) {
						const checkoutUrl =
							checkout.checkoutUrl || pendingCheckout.checkoutUrl;
						return checkoutUrl
							? { kind: "url", url: checkoutUrl }
							: { kind: "error", error: "CHECKOUT_UNAVAILABLE" };
					}
					if (checkout.status === "completed") {
						if (!checkout.id)
							return { kind: "error", error: "CHECKOUT_UNAVAILABLE" };
						return { kind: "completed", checkoutId: checkout.id };
					}
				} catch (error) {
					const checkoutNotFound =
						typeof error === "object" &&
						error !== null &&
						"statusCode" in error &&
						error.statusCode === 404;
					if (!checkoutNotFound)
						return { kind: "error", error: "CHECKOUT_UNAVAILABLE" };
				}
				await tx
					.delete(creemSubscription)
					.where(eq(creemSubscription.id, pendingCheckout.id));
			}

			try {
				const checkout = await creem.checkouts.create({
					productId,
					requestId: checkoutRequestId,
					customer: { email },
					successUrl,
					metadata: { referenceId: userId },
				});
				if (!checkout.checkoutUrl)
					return { kind: "error", error: "CHECKOUT_UNAVAILABLE" };
				await tx.insert(creemSubscription).values({
					id: checkoutRequestId,
					referenceId: userId,
					productId,
					status: "pending",
					checkoutId: checkout.id,
					checkoutUrl: checkout.checkoutUrl,
				});
				return { kind: "url", url: checkout.checkoutUrl };
			} catch {
				return { kind: "error", error: "CHECKOUT_UNAVAILABLE" };
			}
		},
	);
	if (result.kind === "completed") {
		let synced = false;
		try {
			synced = Boolean(
				await syncCreemCheckout(
					db,
					{
						id: result.checkoutId,
						webhookId: `checkout-reconcile-${crypto.randomUUID()}`,
						webhookCreatedAt: Date.now(),
					},
					async (id) => {
						const checkout = await creem.checkouts.retrieve(id);
						if (!checkout) throw new Error("Checkout not found.");
						return checkout;
					},
					async (id) => creem.subscriptions.get(id),
				),
			);
		} catch {
			return { error: "CHECKOUT_PROCESSING" as const };
		}
		const currentPlan = await getAccountPlan({
			db,
			userId,
			proProductIds: [productId],
		});
		if (synced || currentPlan.hasAccess) return { url: successUrl };
		return { error: "CHECKOUT_PROCESSING" as const };
	}
	return result.kind === "url" ? { url: result.url } : { error: result.error };
}

export async function scheduleProCancellation({
	db,
	creem,
	userId,
}: {
	db: DatabaseClient;
	creem: CreemClient;
	userId: string;
}) {
	const subscription = await db.query.creemSubscription.findFirst({
		where: eq(creemSubscription.referenceId, userId),
	});
	if (!subscription?.creemSubscriptionId) return false;
	if (subscription.status === "scheduled_cancel") return true;
	if (!["active", "trialing", "paid"].includes(subscription.status ?? ""))
		return false;

	const canceled = await creem.subscriptions.cancel(
		subscription.creemSubscriptionId,
		{ mode: "scheduled", onExecute: "cancel" },
	);
	if (canceled.status !== "scheduled_cancel")
		throw new Error("Creem did not schedule the subscription cancellation.");

	await db
		.update(creemSubscription)
		.set({
			status: "scheduled_cancel",
			cancelAtPeriodEnd: true,
			periodStart: canceled.currentPeriodStartDate ?? subscription.periodStart,
			periodEnd: canceled.currentPeriodEndDate ?? subscription.periodEnd,
		})
		.where(eq(creemSubscription.id, subscription.id));
	return true;
}
