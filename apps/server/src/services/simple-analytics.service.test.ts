import {
	afterEach,
	describe,
	expect,
	it,
} from "bun:test";
import type { AppBindings } from "types/type";
import {
	getEntryRouteFromRequest,
	trackSimpleAnalyticsEvent,
} from "@services/simple-analytics.service";

const originalFetch = globalThis.fetch;

const env = (frontendUrl: string) =>
	({ FRONTEND_URL: frontendUrl }) as AppBindings;

afterEach(() => {
	globalThis.fetch = originalFetch;
});

describe("simple analytics service", () => {
	it("sends an allowlisted event payload in production", async () => {
		let receivedRequest: Request | undefined;
		globalThis.fetch = async (input, init) => {
			receivedRequest = new Request(input, init);
			return new Response(null, { status: 204 });
		};

		await trackSimpleAnalyticsEvent({
			env: env("https://grabbin.me"),
			event: "signup_completed",
			request: new Request("https://api.grabbin.me/auth", {
				headers: {
					Cookie: "grabbin_entry_route=pricing",
					"User-Agent": "test-agent",
				},
			}),
		});

		expect(receivedRequest?.url).toBe(
			"https://queue.simpleanalyticscdn.com/events",
		);
		expect(await receivedRequest?.json()).toEqual({
			type: "event",
			hostname: "grabbin.me",
			event: "signup_completed",
			metadata: { entry_route: "pricing" },
			ua: "test-agent",
		});
		expect(getEntryRouteFromRequest()).toBe("other");
	});

	it("skips non-production hosts", async () => {
		let fetchCalled = false;
		globalThis.fetch = async () => {
			fetchCalled = true;
			return new Response(null, { status: 204 });
		};

		await trackSimpleAnalyticsEvent({
			env: env("http://localhost:8787"),
			event: "first_page_created",
		});

		expect(fetchCalled).toBe(false);
	});

	it("swallows queue failures", async () => {
		globalThis.fetch = async () => {
			throw new Error("queue unavailable");
		};

		await expect(
			trackSimpleAnalyticsEvent({
				env: env("https://grabbin.me"),
				event: "first_page_created",
			}),
		).resolves.toBeUndefined();
	});
});
