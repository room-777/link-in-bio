import type { CalendlyAvailabilityTime, CalendlyEventType } from "@grabbin/api";
import type { DatabaseClient } from "@grabbin/db";
import { eq } from "@grabbin/db/drizzle";
import { calendlyConnection } from "@grabbin/db/schema/calendly-connection";
import { creemSubscription } from "@grabbin/db/schema/index";
import { getPlanAccess } from "@grabbin/plan";
import * as v from "valibot";

type CalendlyCredentials = {
	clientId: string;
	clientSecret: string;
};

type TokenResponse = {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	owner: string;
};

const tokenResponseSchema = v.pipe(
	v.object({
		access_token: v.string(),
		refresh_token: v.string(),
		expires_in: v.number(),
		owner: v.string(),
	}),
	v.check(
		(token) =>
			/^https:\/\/api\.calendly\.com\/users\/[A-Za-z0-9_-]+$/.test(token.owner),
		"Invalid Calendly owner URI.",
	),
);

const eventTypesPayloadSchema = v.object({
	collection: v.array(v.unknown()),
	pagination: v.optional(
		v.object({ next_page_token: v.optional(v.nullable(v.string())) }),
	),
});
const eventTypePayloadSchema = v.object({
	uri: v.string(),
	name: v.string(),
	duration: v.optional(v.nullable(v.number())),
	description: v.optional(v.nullable(v.string())),
	scheduling_url: v.string(),
	active: v.boolean(),
});
const availabilityPayloadSchema = v.object({
	collection: v.array(v.unknown()),
});
const availabilityTimePayloadSchema = v.object({
	start_time: v.pipe(
		v.string(),
		v.check(
			(value) => Number.isFinite(Date.parse(value)),
			"Invalid start time.",
		),
	),
	scheduling_url: v.string(),
});

class CalendlyTokenError extends Error {
	constructor(
		readonly status: number,
		readonly providerError: string | null,
	) {
		super("CALENDLY_TOKEN_REQUEST_FAILED");
	}
}

class CalendlyApiError extends Error {
	constructor(readonly status: number) {
		super("CALENDLY_API_REQUEST_FAILED");
	}
}

export function createCalendlyAuthorizationUrl(input: {
	clientId: string;
	redirectUri: string;
	state: string;
	codeChallenge: string;
}) {
	const url = new URL("https://auth.calendly.com/oauth/authorize");
	url.search = new URLSearchParams({
		client_id: input.clientId,
		response_type: "code",
		redirect_uri: input.redirectUri,
		state: input.state,
		code_challenge_method: "S256",
		code_challenge: input.codeChallenge,
		scope: "event_types:read availability:read",
	}).toString();
	return url.toString();
}

async function requestToken(
	credentials: CalendlyCredentials,
	values: URLSearchParams,
) {
	let response: Response;
	try {
		response = await fetch("https://auth.calendly.com/oauth/token", {
			method: "POST",
			headers: {
				Authorization: `Basic ${btoa(`${credentials.clientId}:${credentials.clientSecret}`)}`,
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: values,
		});
	} catch {
		throw new Error("CALENDLY_TOKEN_REQUEST_FAILED");
	}
	const result: unknown = await response.json().catch(() => null);
	if (!response.ok) {
		const providerError =
			result &&
			typeof result === "object" &&
			"error" in result &&
			typeof result.error === "string"
				? result.error
				: null;
		throw new CalendlyTokenError(response.status, providerError);
	}
	const parsed = v.safeParse(tokenResponseSchema, result);
	if (!parsed.success) throw new Error("CALENDLY_TOKEN_REQUEST_FAILED");
	return parsed.output satisfies TokenResponse;
}

export async function exchangeCalendlyCode(input: {
	db: DatabaseClient;
	userId: string;
	code: string;
	codeVerifier: string;
	redirectUri: string;
	credentials: CalendlyCredentials;
}) {
	const token = await requestToken(
		input.credentials,
		new URLSearchParams({
			grant_type: "authorization_code",
			code: input.code,
			redirect_uri: input.redirectUri,
			code_verifier: input.codeVerifier,
		}),
	);
	await input.db
		.insert(calendlyConnection)
		.values({
			userId: input.userId,
			ownerUri: token.owner,
			accessToken: token.access_token,
			refreshToken: token.refresh_token,
			accessTokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
		})
		.onConflictDoUpdate({
			target: calendlyConnection.userId,
			set: {
				ownerUri: token.owner,
				accessToken: token.access_token,
				refreshToken: token.refresh_token,
				accessTokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
				updatedAt: new Date(),
			},
		});
}

async function getValidAccessToken(input: {
	db: DatabaseClient;
	userId: string;
	credentials: CalendlyCredentials;
}) {
	const connection = await input.db.query.calendlyConnection.findFirst({
		where: eq(calendlyConnection.userId, input.userId),
	});
	if (!connection) return null;
	if (connection.accessTokenExpiresAt.getTime() > Date.now() + 60_000)
		return connection.accessToken;

	return input.db.transaction(async (tx) => {
		const [locked] = await tx
			.select()
			.from(calendlyConnection)
			.where(eq(calendlyConnection.userId, input.userId))
			.for("update");
		if (!locked) return null;
		if (locked.accessTokenExpiresAt.getTime() > Date.now() + 60_000)
			return locked.accessToken;

		let token: TokenResponse;
		try {
			token = await requestToken(
				input.credentials,
				new URLSearchParams({
					grant_type: "refresh_token",
					refresh_token: locked.refreshToken,
				}),
			);
		} catch (error) {
			if (
				error instanceof CalendlyTokenError &&
				error.providerError === "invalid_grant" &&
				(error.status === 400 || error.status === 401)
			) {
				await tx
					.delete(calendlyConnection)
					.where(eq(calendlyConnection.userId, input.userId));
				return null;
			}
			throw error;
		}
		await tx
			.update(calendlyConnection)
			.set({
				ownerUri: token.owner,
				accessToken: token.access_token,
				refreshToken: token.refresh_token,
				accessTokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
				updatedAt: new Date(),
			})
			.where(eq(calendlyConnection.userId, input.userId));
		return token.access_token;
	});
}

export async function getCalendlyConnection(
	db: DatabaseClient,
	userId: string,
) {
	const row = await db.query.calendlyConnection.findFirst({
		where: eq(calendlyConnection.userId, userId),
		columns: { ownerUri: true },
	});
	return row ?? null;
}

export async function canConnectCalendly(input: {
	db: DatabaseClient;
	userId: string;
	proProductIds: readonly string[];
}) {
	const subscriptions = await input.db.query.creemSubscription.findMany({
		where: eq(creemSubscription.referenceId, input.userId),
	});
	return getPlanAccess(
		subscriptions.map((subscription) => ({
			productId: subscription.productId,
			status: subscription.status,
			periodEnd: subscription.periodEnd,
			cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
		})),
		input.proProductIds,
	).hasAccess;
}

export async function listCalendlyEventTypes(input: {
	db: DatabaseClient;
	userId: string;
	credentials: CalendlyCredentials;
}): Promise<CalendlyEventType[] | null> {
	const connection = await input.db.query.calendlyConnection.findFirst({
		where: eq(calendlyConnection.userId, input.userId),
		columns: { ownerUri: true },
	});
	if (!connection) return null;
	const accessToken = await getValidAccessToken(input);
	if (!accessToken) return null;

	const events: CalendlyEventType[] = [];
	let pageToken: string | undefined;
	for (let page = 0; page < 20; page += 1) {
		const url = new URL("https://api.calendly.com/event_types");
		url.searchParams.set("user", connection.ownerUri);
		url.searchParams.set("count", "100");
		if (pageToken) url.searchParams.set("page_token", pageToken);
		const response = await fetch(url, {
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		if (!response.ok) throw new CalendlyApiError(response.status);
		const payload: unknown = await response.json();
		const parsed = v.safeParse(eventTypesPayloadSchema, payload);
		if (!parsed.success) throw new Error("CALENDLY_EVENTS_RESPONSE_INVALID");
		for (const item of parsed.output.collection) {
			const eventResult = v.safeParse(eventTypePayloadSchema, item);
			if (!eventResult.success) continue;
			const event = eventResult.output;
			let schedulingUrl: URL;
			try {
				schedulingUrl = new URL(event.scheduling_url);
			} catch {
				continue;
			}
			if (
				schedulingUrl.protocol !== "https:" ||
				schedulingUrl.hostname !== "calendly.com"
			)
				continue;
			events.push({
				uri: event.uri,
				name: event.name,
				duration: event.duration ?? null,
				description: event.description ?? null,
				schedulingUrl: event.scheduling_url,
				active: event.active,
			});
		}
		const next = parsed.output.pagination?.next_page_token;
		if (typeof next !== "string" || !next) break;
		pageToken = next;
	}
	return events;
}

export async function listCalendlyEventTypeAvailability(input: {
	db: DatabaseClient;
	userId: string;
	credentials: CalendlyCredentials;
	eventTypeUri: string;
	startTime: Date;
	endTime: Date;
}): Promise<CalendlyAvailabilityTime[] | null> {
	if (
		!/^https:\/\/api\.calendly\.com\/event_types\/[A-Za-z0-9_-]+$/.test(
			input.eventTypeUri,
		)
	)
		throw new Error("CALENDLY_EVENT_TYPE_URI_INVALID");
	if (
		input.startTime.getTime() < Date.now() ||
		input.endTime.getTime() <= input.startTime.getTime() ||
		input.endTime.getTime() - input.startTime.getTime() >
			31 * 24 * 60 * 60 * 1000
	)
		throw new Error("CALENDLY_AVAILABILITY_RANGE_INVALID");

	const accessToken = await getValidAccessToken(input);
	if (!accessToken) return null;

	const url = new URL("https://api.calendly.com/event_type_available_times");
	url.searchParams.set("event_type", input.eventTypeUri);
	url.searchParams.set("start_time", input.startTime.toISOString());
	url.searchParams.set("end_time", input.endTime.toISOString());
	const response = await fetch(url, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (!response.ok) throw new CalendlyApiError(response.status);
	const payload: unknown = await response.json();
	const parsed = v.safeParse(availabilityPayloadSchema, payload);
	if (!parsed.success)
		throw new Error("CALENDLY_AVAILABILITY_RESPONSE_INVALID");
	const times: CalendlyAvailabilityTime[] = [];
	for (const item of parsed.output.collection) {
		const timeResult = v.safeParse(availabilityTimePayloadSchema, item);
		if (!timeResult.success) continue;
		const time = timeResult.output;
		let schedulingUrl: URL;
		try {
			schedulingUrl = new URL(time.scheduling_url);
		} catch {
			continue;
		}
		if (
			schedulingUrl.protocol !== "https:" ||
			schedulingUrl.hostname !== "calendly.com"
		)
			continue;
		times.push({
			startTime: time.start_time,
			schedulingUrl: time.scheduling_url,
		});
	}
	return times.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export async function disconnectCalendly(input: {
	db: DatabaseClient;
	userId: string;
	credentials: CalendlyCredentials;
}) {
	const [connection] = await input.db
		.select({ accessToken: calendlyConnection.accessToken })
		.from(calendlyConnection)
		.where(eq(calendlyConnection.userId, input.userId));
	if (!connection) return;
	const response = await fetch("https://auth.calendly.com/oauth/revoke", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: input.credentials.clientId,
			client_secret: input.credentials.clientSecret,
			token: connection.accessToken,
		}),
	});
	if (!response.ok) throw new Error("CALENDLY_REVOKE_FAILED");
	await input.db
		.delete(calendlyConnection)
		.where(eq(calendlyConnection.userId, input.userId));
}
