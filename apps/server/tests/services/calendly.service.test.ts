import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DatabaseClient } from "@grabbin/db";
import { calendlyConnection } from "@grabbin/db/schema/calendly-connection";
import {
	createCalendlyAuthorizationUrl,
	exchangeCalendlyCode,
	listCalendlyEventTypeAvailability,
	listCalendlyEventTypes,
} from "../../src/services/calendly.service";

function expiredConnectionDb() {
	let deleted = false;
	const connection = {
		userId: "grabbin-user-1",
		ownerUri: "https://api.calendly.com/users/user-123",
		accessToken: "expired-access-token",
		refreshToken: "used-refresh-token",
		accessTokenExpiresAt: new Date(Date.now() - 1000),
	};
	const tx = {
		select: () => ({
			from: () => ({
				where: () => ({ for: async () => [connection] }),
			}),
		}),
		delete: (table: unknown) => {
			assert.equal(table, calendlyConnection);
			return {
				where: async () => {
					deleted = true;
				},
			};
		},
	};
	const db = {
		query: {
			calendlyConnection: {
				findFirst: async (query: { columns?: unknown }) =>
					query.columns ? { ownerUri: connection.ownerUri } : connection,
			},
		},
		transaction: async (callback: (value: typeof tx) => unknown) =>
			callback(tx),
	} as unknown as DatabaseClient;
	return { db, wasDeleted: () => deleted };
}

describe("Calendly connection service", () => {
	/**
	 * Case ID: CALENDLY-SVC-003
	 * Given: a generated PKCE challenge and signed OAuth state.
	 * When: the authorization URL is built.
	 * Then: Calendly receives the same state and redirect URI used by the callback.
	 * Evidence: decoded authorization query. Result: Pass | Fail | Blocked | Not Run
	 */
	it("CALENDLY-SVC-003 sends OAuth state and redirect URI to Calendly", () => {
		const url = new URL(
			createCalendlyAuthorizationUrl({
				clientId: "client-id",
				redirectUri: "http://localhost:3001/auth/callback/calendly",
				state: "signed-state",
				codeChallenge: "pkce-challenge",
			}),
		);
		assert.equal(url.searchParams.get("state"), "signed-state");
		assert.equal(
			url.searchParams.get("scope"),
			"event_types:read availability:read",
		);
		assert.equal(
			url.searchParams.get("redirect_uri"),
			"http://localhost:3001/auth/callback/calendly",
		);
	});

	/**
	 * Case ID: CALENDLY-SVC-001
	 * Given: a valid Calendly authorization code and PKCE verifier.
	 * When: the code is exchanged and linked to a Grabbin user.
	 * Then: the token request includes the verifier and the returned tokens are saved for that user.
	 * Evidence: token request URL/body and inserted connection values. Result: Pass | Fail | Blocked | Not Run
	 */
	it("CALENDLY-SVC-001 exchanges the code and stores the user's connection", async () => {
		let requestUrl = "";
		let requestBody = "";
		let saved: Record<string, unknown> | undefined;
		const originalFetch = globalThis.fetch;
		globalThis.fetch = async (
			input: string | URL | Request,
			init?: RequestInit,
		) => {
			requestUrl = String(input);
			requestBody = String(init?.body);
			return Response.json({
				access_token: "access-token",
				refresh_token: "refresh-token",
				expires_in: 7200,
				owner: "https://api.calendly.com/users/user-123",
			});
		};
		const db = {
			insert: (table: unknown) => {
				assert.equal(table, calendlyConnection);
				return {
					values: (values: Record<string, unknown>) => {
						saved = values;
						return { onConflictDoUpdate: async () => undefined };
					},
				};
			},
		} as unknown as DatabaseClient;

		try {
			await exchangeCalendlyCode({
				db,
				userId: "grabbin-user-1",
				code: "authorization-code",
				codeVerifier: "pkce-verifier",
				redirectUri: "https://api.grabbin.me/auth/callback/calendly",
				credentials: { clientId: "client-id", clientSecret: "client-secret" },
			});
		} finally {
			globalThis.fetch = originalFetch;
		}

		const form = new URLSearchParams(requestBody);
		assert.equal(requestUrl, "https://auth.calendly.com/oauth/token");
		assert.equal(form.get("grant_type"), "authorization_code");
		assert.equal(form.get("code_verifier"), "pkce-verifier");
		assert.equal(
			form.get("redirect_uri"),
			"https://api.grabbin.me/auth/callback/calendly",
		);
		assert.equal(saved?.userId, "grabbin-user-1");
		assert.equal(saved?.ownerUri, "https://api.calendly.com/users/user-123");
		assert.equal(saved?.refreshToken, "refresh-token");
	});

	/**
	 * Case ID: CALENDLY-SVC-002
	 * Given: Calendly rejects the authorization code exchange.
	 * When: the callback exchanges the code.
	 * Then: the service returns a stable failure code without exposing provider data.
	 * Evidence: CALENDLY_TOKEN_REQUEST_FAILED. Result: Pass | Fail | Blocked | Not Run
	 */
	it("CALENDLY-SVC-002 reports a stable error when Calendly rejects the code", async () => {
		const originalFetch = globalThis.fetch;
		globalThis.fetch = async () =>
			Response.json({ error: "invalid_grant" }, { status: 400 });
		try {
			await assert.rejects(
				exchangeCalendlyCode({
					db: {} as DatabaseClient,
					userId: "grabbin-user-1",
					code: "authorization-code",
					codeVerifier: "pkce-verifier",
					redirectUri: "http://localhost:3001/auth/callback/calendly",
					credentials: { clientId: "client-id", clientSecret: "client-secret" },
				}),
				{ message: "CALENDLY_TOKEN_REQUEST_FAILED" },
			);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	/**
	 * Case ID: CALENDLY-SVC-004
	 * Given: the stored refresh token has already been revoked or used.
	 * When: Calendly responds with 400 or 401 during refresh.
	 * Then: the stale connection is removed so the user can reconnect.
	 * Evidence: no event result and deleted connection row. Result: Pass | Fail | Blocked | Not Run
	 */
	it("CALENDLY-SVC-004 clears a connection rejected during refresh", async () => {
		const originalFetch = globalThis.fetch;
		try {
			for (const status of [400, 401]) {
				const { db, wasDeleted } = expiredConnectionDb();
				globalThis.fetch = async () =>
					Response.json({ error: "invalid_grant" }, { status });
				const events = await listCalendlyEventTypes({
					db,
					userId: "grabbin-user-1",
					credentials: { clientId: "client-id", clientSecret: "client-secret" },
				});
				assert.equal(events, null);
				assert.equal(wasDeleted(), true);
			}
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	/**
	 * Case ID: CALENDLY-SVC-005
	 * Given: Calendly temporarily limits refresh requests.
	 * When: it responds with HTTP 429.
	 * Then: the error is returned and the saved connection remains available for retry.
	 * Evidence: CALENDLY_TOKEN_REQUEST_FAILED and no deletion. Result: Pass | Fail | Blocked | Not Run
	 */
	it("CALENDLY-SVC-005 keeps the connection after a temporary refresh failure", async () => {
		const originalFetch = globalThis.fetch;
		const { db, wasDeleted } = expiredConnectionDb();
		globalThis.fetch = async () =>
			Response.json({ error: "rate_limited" }, { status: 429 });
		try {
			await assert.rejects(
				listCalendlyEventTypes({
					db,
					userId: "grabbin-user-1",
					credentials: { clientId: "client-id", clientSecret: "client-secret" },
				}),
				{ message: "CALENDLY_TOKEN_REQUEST_FAILED" },
			);
			assert.equal(wasDeleted(), false);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	/**
	 * Case ID: CALENDLY-SVC-008
	 * Given: Calendly rejects refresh for a reason other than an invalid refresh token.
	 * When: it responds with HTTP 400 and invalid_client.
	 * Then: the saved connection remains so a credentials issue does not disconnect the user.
	 * Evidence: CALENDLY_TOKEN_REQUEST_FAILED and no deletion. Result: Pass | Fail | Blocked | Not Run
	 */
	it("CALENDLY-SVC-008 keeps the connection for non-invalid_grant token errors", async () => {
		const originalFetch = globalThis.fetch;
		const { db, wasDeleted } = expiredConnectionDb();
		globalThis.fetch = async () =>
			Response.json({ error: "invalid_client" }, { status: 400 });
		try {
			await assert.rejects(
				listCalendlyEventTypes({
					db,
					userId: "grabbin-user-1",
					credentials: { clientId: "client-id", clientSecret: "client-secret" },
				}),
				{ message: "CALENDLY_TOKEN_REQUEST_FAILED" },
			);
			assert.equal(wasDeleted(), false);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	/**
	 * Case ID: CALENDLY-SVC-009
	 * Given: Calendly returns valid and malformed event type records.
	 * When: event types are listed for the connected user.
	 * Then: only records matching the typed response shape and Calendly URL are returned.
	 * Evidence: normalized event list includes one validated item and excludes the bad URL. Result: Pass | Fail | Blocked | Not Run
	 */
	it("CALENDLY-SVC-009 validates event type records before returning them", async () => {
		const db = {
			query: {
				calendlyConnection: {
					findFirst: async (query: { columns?: unknown }) =>
						query.columns
							? { ownerUri: "https://api.calendly.com/users/user-123" }
							: {
									accessToken: "access-token",
									refreshToken: "refresh-token",
									accessTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
								},
				},
			},
		} as unknown as DatabaseClient;
		const originalFetch = globalThis.fetch;
		globalThis.fetch = async () =>
			Response.json({
				collection: [
					{
						uri: "https://api.calendly.com/event_types/event-123",
						name: "Intro call",
						duration: 30,
						description: null,
						scheduling_url: "https://calendly.com/host/intro",
						active: true,
					},
					{
						uri: "https://api.calendly.com/event_types/event-456",
						name: "Unsafe URL",
						duration: 30,
						scheduling_url: "https://example.com/booking",
						active: true,
					},
					{ uri: "malformed" },
				],
			});
		try {
			assert.deepEqual(
				await listCalendlyEventTypes({
					db,
					userId: "grabbin-user-1",
					credentials: { clientId: "client-id", clientSecret: "client-secret" },
				}),
				[
					{
						uri: "https://api.calendly.com/event_types/event-123",
						name: "Intro call",
						duration: 30,
						description: null,
						schedulingUrl: "https://calendly.com/host/intro",
						active: true,
					},
				],
			);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	/**
	 * Case ID: CALENDLY-SVC-006
	 * Given: a connected Calendly user and a future range within one month.
	 * When: availability is requested for one of the user's event types.
	 * Then: available dates and Calendly booking links are returned.
	 * Evidence: request query, Bearer token, and filtered result. Result: Pass | Fail | Blocked | Not Run
	 */
	it("CALENDLY-SVC-006 loads event availability for the requested range", async () => {
		let requestUrl = "";
		let authorization = "";
		const startTime = new Date(Date.now() + 60_000);
		const endTime = new Date(startTime.getTime() + 30 * 24 * 60 * 60 * 1000);
		const db = {
			query: {
				calendlyConnection: {
					findFirst: async () => ({
						userId: "grabbin-user-1",
						ownerUri: "https://api.calendly.com/users/user-123",
						accessToken: "access-token",
						refreshToken: "refresh-token",
						accessTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
					}),
				},
			},
		} as unknown as DatabaseClient;
		const originalFetch = globalThis.fetch;
		globalThis.fetch = async (input, init) => {
			requestUrl = String(input);
			authorization = new Headers(init?.headers).get("Authorization") ?? "";
			return Response.json({
				collection: [
					{
						start_time: "2026-11-02T10:00:00.000Z",
						scheduling_url:
							"https://calendly.com/host/meeting/2026-11-02T10:00:00Z",
					},
					{
						start_time: "2026-11-02T11:00:00.000Z",
						scheduling_url: "https://example.com/fake-booking-link",
					},
				],
			});
		};

		try {
			const times = await listCalendlyEventTypeAvailability({
				db,
				userId: "grabbin-user-1",
				credentials: { clientId: "client-id", clientSecret: "client-secret" },
				eventTypeUri: "https://api.calendly.com/event_types/event-123",
				startTime,
				endTime,
			});
			const url = new URL(requestUrl);
			assert.equal(url.pathname, "/event_type_available_times");
			assert.equal(
				url.searchParams.get("event_type"),
				"https://api.calendly.com/event_types/event-123",
			);
			assert.equal(url.searchParams.get("start_time"), startTime.toISOString());
			assert.equal(url.searchParams.get("end_time"), endTime.toISOString());
			assert.equal(authorization, "Bearer access-token");
			assert.deepEqual(times, [
				{
					startTime: "2026-11-02T10:00:00.000Z",
					schedulingUrl:
						"https://calendly.com/host/meeting/2026-11-02T10:00:00Z",
				},
			]);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	/**
	 * Case ID: CALENDLY-SVC-007
	 * Given: Calendly temporarily rejects an availability request due to its rate limit.
	 * When: availability is requested for a connected event type.
	 * Then: the service preserves the 429 status so the API can show a retry action.
	 * Evidence: thrown provider status is 429. Result: Pass | Fail | Blocked | Not Run
	 */
	it("CALENDLY-SVC-007 preserves Calendly's availability rate limit status", async () => {
		const startTime = new Date(Date.now() + 60_000);
		const endTime = new Date(startTime.getTime() + 30 * 24 * 60 * 60 * 1000);
		const db = {
			query: {
				calendlyConnection: {
					findFirst: async () => ({
						userId: "grabbin-user-1",
						ownerUri: "https://api.calendly.com/users/user-123",
						accessToken: "access-token",
						refreshToken: "refresh-token",
						accessTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
					}),
				},
			},
		} as unknown as DatabaseClient;
		const originalFetch = globalThis.fetch;
		globalThis.fetch = async () =>
			Response.json({ error: "rate_limited" }, { status: 429 });
		try {
			await assert.rejects(
				listCalendlyEventTypeAvailability({
					db,
					userId: "grabbin-user-1",
					credentials: {
						clientId: "client-id",
						clientSecret: "client-secret",
					},
					eventTypeUri: "https://api.calendly.com/event_types/event-123",
					startTime,
					endTime,
				}),
				(error: unknown) => {
					assert.equal((error as { status?: number }).status, 429);
					return true;
				},
			);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});
