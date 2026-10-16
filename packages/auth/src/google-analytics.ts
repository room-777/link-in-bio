import type { DatabaseClient } from "@grabbin/db";
import { analyticsEvents, user } from "@grabbin/db/schema/index";
import { and, eq } from "drizzle-orm";

/** GA4 events sent from the server with the Measurement Protocol. */
export type ServerEventName =
	| "begin_checkout"
	| "purchase"
	| "sign_up"
	| "login"
	| "page_created"
	| "first_link_added";

/** Events that may be sent only once per user, decided by the database. */
export type OnceEventName = Exclude<
	ServerEventName,
	"begin_checkout" | "login" | "purchase"
>;

export type AnalyticsItem = {
	item_id: string;
	item_name?: string;
	price?: number;
	quantity?: number;
};

export type AnalyticsEventParams = Record<
	string,
	string | number | boolean | AnalyticsItem[]
>;

export type PurchaseEventParams = AnalyticsEventParams & {
	transaction_id: string;
	value: number;
	currency: string;
	items: (AnalyticsItem & {
		item_name: string;
		price: number;
		quantity: number;
	})[];
};

export type GoogleAnalyticsConfig = {
	measurementId: string;
	apiSecret: string;
	/** "collect" records hits (production only); "validate" only checks them. */
	mode: "collect" | "validate";
};

export type BrowserAnalyticsContext = {
	clientId: string | null;
	sessionId: number | null;
	internal: boolean;
};

/** Cookie the web app sets with `?internal=1` so the API can see it too. */
export const INTERNAL_TRAFFIC_COOKIE = "grabbin_ga_internal";

const COLLECT_URL = "https://www.google-analytics.com/mp/collect";
const VALIDATE_URL = "https://www.google-analytics.com/debug/mp/collect";

function readCookies(header: string | null) {
	const cookies = new Map<string, string>();
	for (const part of header?.split(";") ?? []) {
		const index = part.indexOf("=");
		if (index > 0) {
			cookies.set(part.slice(0, index).trim(), part.slice(index + 1).trim());
		}
	}
	return cookies;
}

/**
 * Reads the browser's GA ids from the `_ga` and `_ga_<id>` cookies, which
 * gtag sets on the parent domain so api.grabbin.me receives them.
 * `_ga=GA1.1.<client id>`; `_ga_<id>=GS1.1.<session id>...` or
 * `GS2.1.s<session id>$...`.
 */
export function readBrowserAnalyticsContext(
	headers: Headers | undefined,
	measurementId: string,
): BrowserAnalyticsContext {
	const cookies = readCookies(headers?.get("cookie") ?? null);
	const clientId =
		/^GA\d+\.\d+\.(\d+\.\d+)$/.exec(cookies.get("_ga") ?? "")?.[1] ?? null;
	const sessionCookie =
		cookies.get(`_ga_${measurementId.replace(/^G-/, "")}`) ?? "";
	const session = /^GS\d+\.\d+\.s?(\d+)/.exec(sessionCookie)?.[1];
	return {
		clientId,
		sessionId: session ? Number(session) : null,
		internal: cookies.get(INTERNAL_TRAFFIC_COOKIE) === "1",
	};
}

/**
 * Records a once-only event. Returns true only for the first caller: the
 * check and the write are one INSERT ... ON CONFLICT DO NOTHING.
 */
export async function claimAnalyticsEvent(
	db: DatabaseClient,
	userId: string,
	eventName: OnceEventName,
) {
	const rows = await db
		.insert(analyticsEvents)
		.values({ userId, eventName })
		.onConflictDoNothing()
		.returning({ userId: analyticsEvents.userId });
	return rows.length > 0;
}

function randomClientId() {
	const random = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
	return `${random}.${Math.floor(Date.now() / 1000)}`;
}

export type MeasurementProtocolEvent = {
	name: ServerEventName;
	userId: string;
	browser: BrowserAnalyticsContext;
	params?: AnalyticsEventParams;
};

/** Builds the Measurement Protocol body. Only internal ids are sent. */
export function buildMeasurementProtocolBody(event: MeasurementProtocolEvent) {
	return {
		// Without a browser id (ad blockers) the event still counts; the
		// traffic source stays unknown, as the spec allows.
		client_id: event.browser.clientId ?? randomClientId(),
		user_id: event.userId,
		user_properties: { user_type: { value: "creator" } },
		events: [
			{
				name: event.name,
				params: {
					...event.params,
					...(event.browser.sessionId
						? { session_id: event.browser.sessionId }
						: {}),
					...(event.browser.internal ? { traffic_type: "internal" } : {}),
					engagement_time_msec: 1,
				},
			},
		],
	};
}

export async function sendMeasurementProtocolEvent(
	config: GoogleAnalyticsConfig,
	event: MeasurementProtocolEvent,
	fetchImpl: typeof fetch = fetch,
) {
	const url = new URL(config.mode === "collect" ? COLLECT_URL : VALIDATE_URL);
	url.searchParams.set("measurement_id", config.measurementId);
	url.searchParams.set("api_secret", config.apiSecret);
	const body = buildMeasurementProtocolBody(event);
	const response = await fetchImpl(url, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
	if (config.mode !== "validate") return { status: response.status };
	return {
		status: response.status,
		validation: await response.text(),
		// Local runs log the exact hit next to GA's verdict.
		payload: body,
	};
}

export type ServerEventTrackerDeps = {
	config: GoogleAnalyticsConfig | null;
	createDb: () => Promise<DatabaseClient>;
	waitUntil: (promise: Promise<unknown>) => void;
	fetch?: typeof fetch;
	log?: (message: string, detail: Record<string, unknown>) => void;
};

export type TrackServerEventInput = {
	userId: string;
	headers?: Headers;
	once?: OnceEventName;
} & (
	| { name: "purchase"; params: PurchaseEventParams; once?: never }
	| {
			name: Exclude<ServerEventName, "purchase">;
			params?:
				| AnalyticsEventParams
				| ((db: DatabaseClient) => Promise<AnalyticsEventParams>);
	  }
);

/**
 * Sends GA events in the background. Nothing here can slow down or fail the
 * user's request: work runs in waitUntil and every error is only logged.
 */
export function createServerEventTracker(deps: ServerEventTrackerDeps) {
	const log = deps.log ?? ((message, detail) => console.warn(message, detail));

	async function run(input: TrackServerEventInput) {
		const config = deps.config;
		if (!config) return { sent: false, reason: "disabled" as const };
		const browser = readBrowserAnalyticsContext(
			input.headers,
			config.measurementId,
		);
		const db =
			input.once || typeof input.params === "function"
				? await deps.createDb()
				: null;
		let claimed = false;
		try {
			if (db && input.once) {
				claimed = await claimAnalyticsEvent(db, input.userId, input.once);
				if (!claimed) {
					log("ga server event skipped", {
						event: input.name,
						reason: "already_sent",
					});
					return { sent: false, reason: "already_sent" as const };
				}
			}
			const params =
				typeof input.params === "function" && db
					? await input.params(db)
					: (input.params as AnalyticsEventParams | undefined);
			const result = await sendMeasurementProtocolEvent(
				config,
				{ name: input.name, userId: input.userId, browser, params },
				deps.fetch,
			);
			if (result.status < 200 || result.status >= 300) {
				throw new Error(`GA responded with ${result.status}`);
			}
			logSent(input.name, config, browser, result);
			return { sent: true as const, ...result };
		} catch (error) {
			if (db && claimed) {
				if (input.once) {
					await releaseAnalyticsEvent(db, input.userId, input.once).catch(
						() => undefined,
					);
				}
			}
			throw error;
		} finally {
			await db?.$client.end().catch(() => undefined);
		}
	}

	function logSent(
		name: ServerEventName,
		config: GoogleAnalyticsConfig,
		browser: BrowserAnalyticsContext,
		result: Awaited<ReturnType<typeof sendMeasurementProtocolEvent>>,
	) {
		log("ga server event", {
			event: name,
			mode: config.mode,
			status: result.status,
			hasClientId: Boolean(browser.clientId),
			hasSessionId: Boolean(browser.sessionId),
			internal: browser.internal,
			...(result.validation
				? {
						validation: result.validation,
						payload: JSON.stringify(result.payload),
					}
				: {}),
		});
	}

	function track(input: TrackServerEventInput) {
		const task = run(input).catch((error: unknown) => {
			log("ga server event failed", {
				event: input.name,
				error: error instanceof Error ? error.message : String(error),
			});
			return { sent: false, reason: "error" as const };
		});
		deps.waitUntil(task);
		return task;
	}

	/**
	 * A new session is a sign_up the first time this user ever signs in
	 * (claimed in the database) and a login every time after that.
	 */
	function trackSignIn(input: {
		userId: string;
		headers?: Headers;
		method: string;
	}) {
		const params = { method: input.method };
		const task = run({ ...input, name: "sign_up", once: "sign_up", params })
			.then((result) =>
				result.sent === false && result.reason === "already_sent"
					? run({ ...input, name: "login", params })
					: result,
			)
			.catch((error: unknown) => {
				log("ga server event failed", {
					event: "sign_up",
					error: error instanceof Error ? error.message : String(error),
				});
				return { sent: false, reason: "error" as const };
			});
		deps.waitUntil(task);
		return task;
	}

	return { track, trackSignIn, run };
}

/** Forgets a claim whose event could not be delivered. */
export async function releaseAnalyticsEvent(
	db: DatabaseClient,
	userId: string,
	eventName: OnceEventName,
) {
	await db
		.delete(analyticsEvents)
		.where(
			and(
				eq(analyticsEvents.userId, userId),
				eq(analyticsEvents.eventName, eventName),
			),
		);
}

/** Seconds between account creation and now, for page_created. */
export async function readTimeSinceSignup(db: DatabaseClient, userId: string) {
	const [row] = await db
		.select({ createdAt: user.createdAt })
		.from(user)
		.where(eq(user.id, userId));
	const seconds = row
		? Math.max(0, Math.round((Date.now() - row.createdAt.getTime()) / 1000))
		: 0;
	return { time_since_signup_sec: seconds };
}

export type ServerEventTracker = ReturnType<typeof createServerEventTracker>;
