const MAPBOX_FORWARD_GEOCODING_URL =
	"https://api.mapbox.com/search/geocode/v6/forward";

export type MapSearchResult = {
	id: string;
	name: string;
	address?: string;
	latitude: number;
	longitude: number;
};

export type MapboxGeocodingErrorCode =
	| "missing-token"
	| "invalid-query"
	| "http"
	| "invalid-response"
	| "network";

export class MapboxGeocodingError extends Error {
	readonly code: MapboxGeocodingErrorCode;
	readonly status?: number;

	constructor(
		code: MapboxGeocodingErrorCode,
		message: string,
		status?: number,
	) {
		super(message);
		this.name = "MapboxGeocodingError";
		this.code = code;
		this.status = status;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isAbortError(error: unknown) {
	return isRecord(error) && error.name === "AbortError";
}

function invalidResponse() {
	return new MapboxGeocodingError(
		"invalid-response",
		"Mapbox returned an invalid geocoding response.",
	);
}

function normalizeFeature(feature: unknown): MapSearchResult {
	if (!isRecord(feature) || !isRecord(feature.geometry))
		throw invalidResponse();
	const geometry = feature.geometry;
	const coordinates = geometry.coordinates;
	const properties = feature.properties;
	const id =
		typeof feature.id === "string"
			? feature.id
			: isRecord(properties) && typeof properties.mapbox_id === "string"
				? properties.mapbox_id
				: undefined;
	if (
		geometry.type !== "Point" ||
		!Array.isArray(coordinates) ||
		coordinates.length < 2 ||
		!coordinates.every(
			(coordinate) =>
				typeof coordinate === "number" && Number.isFinite(coordinate),
		) ||
		!isRecord(properties) ||
		!id ||
		typeof properties.name !== "string"
	) {
		throw invalidResponse();
	}
	const address =
		typeof properties.place_formatted === "string"
			? properties.place_formatted
			: undefined;
	return {
		id,
		name: properties.name,
		...(address ? { address } : {}),
		latitude: coordinates[1] as number,
		longitude: coordinates[0] as number,
	};
}

export async function searchMapboxLocations(
	query: string,
	options?: { accessToken?: string; language?: string; signal?: AbortSignal },
) {
	const trimmedQuery = query.trim();
	if (trimmedQuery.length < 2) {
		throw new MapboxGeocodingError(
			"invalid-query",
			"Mapbox search queries must contain at least 2 characters.",
		);
	}
	const accessToken = options?.accessToken?.trim();
	if (!accessToken) {
		throw new MapboxGeocodingError(
			"missing-token",
			"A Mapbox access token is required for geocoding.",
		);
	}
	const url = new URL(MAPBOX_FORWARD_GEOCODING_URL);
	url.searchParams.set("q", trimmedQuery);
	url.searchParams.set("autocomplete", "true");
	url.searchParams.set("limit", "5");
	url.searchParams.set("permanent", "false");
	if (options?.language) url.searchParams.set("language", options.language);
	url.searchParams.set("access_token", accessToken);
	let response: Response;
	try {
		response = await fetch(url, { signal: options?.signal });
	} catch (error) {
		if (isAbortError(error)) throw error;
		throw new MapboxGeocodingError(
			"network",
			"The Mapbox geocoding request failed.",
		);
	}
	if (!response.ok) {
		throw new MapboxGeocodingError(
			"http",
			`Mapbox geocoding failed with status ${response.status}.`,
			response.status,
		);
	}
	let payload: unknown;
	try {
		payload = await response.json();
	} catch {
		throw invalidResponse();
	}
	if (!isRecord(payload) || !Array.isArray(payload.features)) {
		throw invalidResponse();
	}
	return payload.features.map(normalizeFeature);
}
