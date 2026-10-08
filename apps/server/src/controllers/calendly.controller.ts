import { env } from "@grabbin/env/server";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { jsonApiError } from "../api-error";
import { requiredSession } from "../middlewares/session.middleware";
import {
	canConnectCalendly,
	createCalendlyAuthorizationUrl,
	disconnectCalendly,
	exchangeCalendlyCode,
	getCalendlyConnection,
	listCalendlyEventTypeAvailability,
	listCalendlyEventTypes,
} from "../services/calendly.service";
import type { AppEnv } from "../types";

const oauthCookie = "calendly_oauth";
const cookiePath = "/auth";
const redirectPath = "/auth/callback/calendly";
const fallbackReturnTo = "/";

function base64Url(bytes: Uint8Array) {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary)
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replace(/=+$/, "");
}

async function signState(value: string, secret: string) {
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	return base64Url(
		new Uint8Array(
			await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)),
		),
	);
}

function credentials(c: { env: AppEnv["Bindings"] }) {
	return {
		clientId: c.env.CALENDLY_CLIENT_ID,
		clientSecret: c.env.CALENDLY_CLIENT_SECRET,
	};
}

function proProductIds(bindings: AppEnv["Bindings"]) {
	return [
		bindings.CREEM_PRO_MONTHLY_PRODUCT_ID,
		bindings.CREEM_PRO_YEARLY_PRODUCT_ID,
	].filter(Boolean);
}

function clearOauthCookie(c: Parameters<typeof deleteCookie>[0]) {
	deleteCookie(c, oauthCookie, {
		path: cookiePath,
		httpOnly: true,
		secure: new URL(c.req.url).protocol === "https:",
		sameSite: "Lax",
	});
}

function safeReturnTo(value: string | undefined, webOrigin: string) {
	if (
		!value?.startsWith("/") ||
		value.startsWith("//") ||
		value.includes("\\")
	) {
		return fallbackReturnTo;
	}
	try {
		const url = new URL(value, webOrigin);
		return url.origin === new URL(webOrigin).origin
			? `${url.pathname}${url.search}`
			: fallbackReturnTo;
	} catch {
		return fallbackReturnTo;
	}
}

function decodeBase64Url(value: string) {
	const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
	const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
	return new TextDecoder().decode(
		Uint8Array.from(binary, (character) => character.charCodeAt(0)),
	);
}

function returnUrl(
	webOrigin: string,
	returnTo: string,
	result: string,
	reason?: string,
) {
	const url = new URL(safeReturnTo(returnTo, webOrigin), webOrigin);
	url.searchParams.set("calendly", result);
	if (reason) url.searchParams.set("calendly_error", reason);
	return url.toString();
}

export function createCalendlyController({
	sessionMiddleware = requiredSession,
	exchangeCode = exchangeCalendlyCode,
	canConnect = canConnectCalendly,
}: {
	sessionMiddleware?: typeof requiredSession;
	exchangeCode?: typeof exchangeCalendlyCode;
	canConnect?: typeof canConnectCalendly;
} = {}) {
	const webOrigin = env.CORS_ORIGIN.split(",")[0]?.trim() ?? "";
	return new Hono<AppEnv>()
		.get("/auth/calendly", sessionMiddleware, async (c) => {
			const connection = await getCalendlyConnection(
				c.var.db,
				c.var.session?.user.id ?? "",
			);
			return c.json({ connected: Boolean(connection) });
		})
		.get("/auth/calendly/connect", sessionMiddleware, async (c) => {
			const userId = c.var.session?.user.id ?? "";
			if (
				!(await canConnect({
					db: c.var.db,
					userId,
					proProductIds: proProductIds(c.env),
				}))
			)
				return jsonApiError(c, {
					status: 403,
					code: "PRO_REQUIRED",
					detail: "A Pro plan is required to connect Calendly.",
				});
			const { clientId, clientSecret } = credentials(c);
			if (!clientId || !clientSecret)
				return jsonApiError(c, {
					status: 503,
					code: "CALENDLY_UNAVAILABLE",
					detail: "Calendly connection is not configured.",
				});
			const state = base64Url(crypto.getRandomValues(new Uint8Array(32)));
			const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));
			const encodedUserId = base64Url(
				new TextEncoder().encode(c.var.session?.user.id ?? ""),
			);
			const returnTo = safeReturnTo(c.req.query("return_to"), webOrigin);
			const encodedReturnTo = base64Url(new TextEncoder().encode(returnTo));
			const signature = await signState(
				`${state}.${verifier}.${encodedUserId}.${encodedReturnTo}`,
				clientSecret,
			);
			const digest = await crypto.subtle.digest(
				"SHA-256",
				new TextEncoder().encode(verifier),
			);
			const codeChallenge = base64Url(new Uint8Array(digest));
			const redirectUri = new URL(redirectPath, c.req.url).toString();
			setCookie(
				c,
				oauthCookie,
				`${state}.${verifier}.${encodedUserId}.${encodedReturnTo}.${signature}`,
				{
					path: cookiePath,
					maxAge: 600,
					httpOnly: true,
					secure: new URL(c.req.url).protocol === "https:",
					sameSite: "Lax",
				},
			);
			return c.redirect(
				createCalendlyAuthorizationUrl({
					clientId,
					redirectUri,
					state,
					codeChallenge,
				}),
			);
		})
		.get(redirectPath, sessionMiddleware, async (c) => {
			const stateCookie = getCookie(c, oauthCookie);
			const [savedState, verifier, savedUserId, encodedReturnTo, signature] =
				stateCookie?.split(".") ?? [];
			let returnTo = fallbackReturnTo;
			try {
				if (encodedReturnTo)
					returnTo = safeReturnTo(decodeBase64Url(encodedReturnTo), webOrigin);
			} catch {
				returnTo = fallbackReturnTo;
			}
			const code = c.req.query("code");
			const { clientSecret } = credentials(c);
			const expectedSignature =
				savedState && verifier && savedUserId && encodedReturnTo
					? await signState(
							`${savedState}.${verifier}.${savedUserId}.${encodedReturnTo}`,
							clientSecret,
						)
					: "";
			const currentUserId = base64Url(
				new TextEncoder().encode(c.var.session?.user.id ?? ""),
			);
			const stateError = !code
				? c.req.query("error")
					? "authorization_denied"
					: "missing_code"
				: !stateCookie
					? "missing_cookie"
					: !savedState ||
							!verifier ||
							!savedUserId ||
							!encodedReturnTo ||
							!signature
						? "malformed_cookie"
						: savedState !== c.req.query("state")
							? "state_mismatch"
							: savedUserId !== currentUserId
								? "user_mismatch"
								: signature !== expectedSignature
									? "signature_mismatch"
									: null;
			if (stateError || !code || !verifier) {
				clearOauthCookie(c);
				return c.redirect(
					returnUrl(webOrigin, returnTo, "error", stateError ?? "missing_code"),
				);
			}
			if (
				!(await canConnect({
					db: c.var.db,
					userId: c.var.session?.user.id ?? "",
					proProductIds: proProductIds(c.env),
				}))
			) {
				clearOauthCookie(c);
				return c.redirect(
					returnUrl(webOrigin, returnTo, "error", "pro_required"),
				);
			}

			try {
				await exchangeCode({
					db: c.var.db,
					userId: c.var.session?.user.id ?? "",
					code,
					codeVerifier: verifier,
					redirectUri: new URL(redirectPath, c.req.url).toString(),
					credentials: credentials(c),
				});
				clearOauthCookie(c);
				return c.redirect(returnUrl(webOrigin, returnTo, "connected"));
			} catch (error) {
				clearOauthCookie(c);
				const reason =
					error instanceof Error &&
					error.message === "CALENDLY_TOKEN_REQUEST_FAILED"
						? "token_exchange"
						: "save_connection";
				return c.redirect(returnUrl(webOrigin, returnTo, "error", reason));
			}
		})
		.get("/auth/calendly/events", sessionMiddleware, async (c) => {
			try {
				const events = await listCalendlyEventTypes({
					db: c.var.db,
					userId: c.var.session?.user.id ?? "",
					credentials: credentials(c),
				});
				if (!events)
					return jsonApiError(c, {
						status: 409,
						code: "CALENDLY_NOT_CONNECTED",
						detail: "Connect your Calendly account to view event types.",
					});
				return c.json({ events });
			} catch (error) {
				if (
					error &&
					typeof error === "object" &&
					"status" in error &&
					error.status === 429
				)
					return jsonApiError(c, {
						status: 429,
						code: "CALENDLY_RATE_LIMITED",
						detail: "Calendly is busy. Book directly on Calendly instead.",
					});
				return jsonApiError(c, {
					status: 502,
					code: "CALENDLY_REQUEST_FAILED",
					detail: "Could not load Calendly event types. Please try again.",
				});
			}
		})
		.get("/auth/calendly/availability", sessionMiddleware, async (c) => {
			const eventTypeUri = c.req.query("event_type") ?? "";
			const startValue = c.req.query("start_time") ?? "";
			const endValue = c.req.query("end_time") ?? "";
			const dateTimePattern =
				/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
			const startTime = new Date(startValue);
			const endTime = new Date(endValue);
			if (
				!dateTimePattern.test(startValue) ||
				!dateTimePattern.test(endValue) ||
				!Number.isFinite(startTime.getTime()) ||
				!Number.isFinite(endTime.getTime()) ||
				startTime.getTime() < Date.now() ||
				endTime.getTime() <= startTime.getTime() ||
				endTime.getTime() - startTime.getTime() > 31 * 24 * 60 * 60 * 1000
			)
				return jsonApiError(c, {
					status: 400,
					code: "CALENDLY_AVAILABILITY_RANGE_INVALID",
					detail: "Choose a future date range of 31 days or less.",
				});
			try {
				const times = await listCalendlyEventTypeAvailability({
					db: c.var.db,
					userId: c.var.session?.user.id ?? "",
					credentials: credentials(c),
					eventTypeUri,
					startTime,
					endTime,
				});
				if (!times)
					return jsonApiError(c, {
						status: 409,
						code: "CALENDLY_NOT_CONNECTED",
						detail: "Connect your Calendly account to view available times.",
					});
				return c.json({ times });
			} catch (error) {
				if (
					error instanceof Error &&
					error.message === "CALENDLY_EVENT_TYPE_URI_INVALID"
				)
					return jsonApiError(c, {
						status: 400,
						code: "CALENDLY_EVENT_TYPE_URI_INVALID",
						detail: "Choose a valid Calendly event type.",
					});
				if (
					error &&
					typeof error === "object" &&
					"status" in error &&
					error.status === 429
				)
					return jsonApiError(c, {
						status: 429,
						code: "CALENDLY_RATE_LIMITED",
						detail: "Calendly is busy. Wait a moment, then try again.",
					});
				if (
					error &&
					typeof error === "object" &&
					"status" in error &&
					error.status === 403
				)
					return jsonApiError(c, {
						status: 403,
						code: "CALENDLY_SCOPE_REQUIRED",
						detail:
							"Reconnect Calendly and approve access to event availability.",
					});
				return jsonApiError(c, {
					status: 502,
					code: "CALENDLY_AVAILABILITY_REQUEST_FAILED",
					detail: "Could not load available times. Please try again.",
				});
			}
		})
		.post("/auth/calendly/disconnect", sessionMiddleware, async (c) => {
			try {
				await disconnectCalendly({
					db: c.var.db,
					userId: c.var.session?.user.id ?? "",
					credentials: credentials(c),
				});
				return c.json({ success: true });
			} catch {
				return jsonApiError(c, {
					status: 502,
					code: "CALENDLY_DISCONNECT_FAILED",
					detail: "Could not disconnect Calendly. Please try again.",
				});
			}
		});
}

export const calendlyController = createCalendlyController();
