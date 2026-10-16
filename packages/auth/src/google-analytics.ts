/** GA4 events sent from the server with the Measurement Protocol. */
export type ServerEventName = "purchase";

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
	waitUntil: (promise: Promise<unknown>) => void;
	fetch?: typeof fetch;
	log?: (message: string, detail: Record<string, unknown>) => void;
};

export type TrackServerEventInput = {
	userId: string;
	headers?: Headers;
	name: "purchase";
	params: PurchaseEventParams;
};

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
		const result = await sendMeasurementProtocolEvent(
			config,
			{ name: input.name, userId: input.userId, browser, params: input.params },
			deps.fetch,
		);
		if (result.status < 200 || result.status >= 300) {
			throw new Error(`GA responded with ${result.status}`);
		}
		logSent(input.name, config, browser, result);
		return { sent: true as const, ...result };
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

	return { track, run };
}

export type ServerEventTracker = ReturnType<typeof createServerEventTracker>;
