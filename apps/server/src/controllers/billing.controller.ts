import { reconcileUserPageLifecycle } from "@grabbin/application/page-lifecycle";
import { createCreemClient } from "@grabbin/auth/creem-server";
import { Hono } from "hono";
import { jsonApiError } from "../api-error";
import { requiredSession } from "../middlewares/session.middleware";
import {
	createOrResumeProCheckout,
	scheduleProCancellation,
} from "../services/billing.service";
import type { AppEnv } from "../types";

function proProductIds(bindings: AppEnv["Bindings"]) {
	return [
		bindings.CREEM_PRO_MONTHLY_PRODUCT_ID,
		bindings.CREEM_PRO_YEARLY_PRODUCT_ID,
	].filter(Boolean);
}

export const billingController = new Hono<AppEnv>()
	.post("/auth/creem/create-checkout", requiredSession, async (c) => {
		const session = c.var.session;
		if (!session)
			return jsonApiError(c, {
				status: 401,
				detail: "Authentication required.",
			});
		const body = await c.req.raw
			.clone()
			.json<{ productId?: unknown; successUrl?: unknown }>()
			.catch(() => null);
		const allowedProductIds = proProductIds(c.env);
		if (
			!body ||
			typeof body.productId !== "string" ||
			!allowedProductIds.includes(body.productId)
		)
			return jsonApiError(c, {
				status: 422,
				code: "INVALID_PLAN",
				detail: "Choose an available Pro plan.",
			});

		let successUrl: string;
		try {
			const defaultUrl = new URL(c.env.CREEM_SUCCESS_URL);
			const requestedUrl =
				typeof body.successUrl === "string"
					? new URL(body.successUrl, defaultUrl)
					: defaultUrl;
			if (requestedUrl.origin !== defaultUrl.origin) throw new Error();
			successUrl = requestedUrl.toString();
		} catch {
			return jsonApiError(c, {
				status: 422,
				code: "INVALID_SUCCESS_URL",
				detail: "Choose a valid return URL.",
			});
		}

		const checkoutResult = await createOrResumeProCheckout({
			db: c.var.db,
			creem: createCreemClient({
				apiKey: c.env.CREEM_API_KEY,
				testMode: c.env.CREEM_TEST_MODE === "true",
			}),
			userId: session.user.id,
			email: session.user.email,
			productId: body.productId,
			successUrl,
		});
		if ("error" in checkoutResult)
			return jsonApiError(c, {
				status: checkoutResult.error === "CHECKOUT_UNAVAILABLE" ? 503 : 409,
				code: checkoutResult.error,
				detail:
					checkoutResult.error === "SUBSCRIPTION_EXISTS"
						? "This account already has a subscription."
						: checkoutResult.error === "CHECKOUT_PROCESSING"
							? "Your payment is processing. Please try again shortly."
							: checkoutResult.error === "CHECKOUT_IN_PROGRESS"
								? "Finish or wait for your current checkout before choosing another plan."
								: "Checkout is temporarily unavailable. Please try again.",
			});
		return c.json({ url: checkoutResult.url, redirect: false });
	})
	.post("/billing/cancel-subscription", requiredSession, async (c) => {
		const session = c.var.session;
		if (!session)
			return jsonApiError(c, {
				status: 401,
				detail: "Authentication required.",
			});
		try {
			const scheduled = await scheduleProCancellation({
				db: c.var.db,
				creem: createCreemClient({
					apiKey: c.env.CREEM_API_KEY,
					testMode: c.env.CREEM_TEST_MODE === "true",
				}),
				userId: session.user.id,
			});
			if (!scheduled)
				return jsonApiError(c, {
					status: 409,
					code: "SUBSCRIPTION_NOT_ACTIVE",
					detail: "There is no active subscription to cancel.",
				});
			await reconcileUserPageLifecycle({
				db: c.var.db,
				userId: session.user.id,
				proProductIds: proProductIds(c.env),
			});
			return c.json({ success: true });
		} catch {
			return jsonApiError(c, {
				status: 503,
				code: "SUBSCRIPTION_CANCELLATION_FAILED",
				detail:
					"Could not schedule subscription cancellation. Please try again.",
			});
		}
	});
