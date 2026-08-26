import type { AppBindings } from "types/type";

export type EntryRoute =
	| "home"
	| "pricing"
	| "blog"
	| "demo"
	| "login"
	| "new"
	| "public_handle"
	| "other";

type SimpleAnalyticsEventName =
	| "signup_completed"
	| "first_page_created";

export type TrackSimpleAnalyticsEventInput = {
	env: AppBindings;
	event: SimpleAnalyticsEventName;
	request?: Request;
	entryRoute?: EntryRoute | null;
};

const SIMPLE_ANALYTICS_EVENTS_URL =
	"https://queue.simpleanalyticscdn.com/events";

const entryRoutes = new Set<EntryRoute>([
	"home",
	"pricing",
	"blog",
	"demo",
	"login",
	"new",
	"public_handle",
	"other",
]);

const isEntryRoute = (
	value: string,
): value is EntryRoute => entryRoutes.has(value as EntryRoute);

export function getEntryRouteFromRequest(
	request?: Request,
): EntryRoute {
	const cookie = request?.headers.get("cookie");
	const match = cookie?.match(
		/(?:^|;\s*)grabbin_entry_route=([^;]*)/,
	);
	if (!match) return "other";
	try {
		const value = decodeURIComponent(match[1] ?? "");
		return isEntryRoute(value) ? value : "other";
	} catch {
		return "other";
	}
}

export async function trackSimpleAnalyticsEvent(
	input: TrackSimpleAnalyticsEventInput,
): Promise<void> {
	try {
		if (
			new URL(input.env.FRONTEND_URL).hostname !==
			"grabbin.me"
		)
			return;

		const entryRoute =
			input.entryRoute && isEntryRoute(input.entryRoute)
				? input.entryRoute
				: getEntryRouteFromRequest(input.request);
		const response = await fetch(
			SIMPLE_ANALYTICS_EVENTS_URL,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					type: "event",
					hostname: "grabbin.me",
					event: input.event,
					metadata: { entry_route: entryRoute },
					ua:
						input.request?.headers.get("user-agent") ??
						"ServerSide/1.0 (+https://grabbin.me/)",
				}),
			},
		);

		if (!response.ok)
			console.warn(
				"Simple Analytics event delivery failed",
				{
					event: input.event,
					status: response.status,
				},
			);
	} catch {
		console.warn(
			"Simple Analytics event delivery failed",
			{
				event: input.event,
				status: "fetch_error",
			},
		);
	}
}
