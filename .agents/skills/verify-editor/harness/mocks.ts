import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import type { BrowserContext, Route } from "@playwright/test";
import { API, LOGS_DIR, WEB } from "./local.ts";

const PIXEL_PNG = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pZ8AAAAASUVORK5CYII=",
	"base64",
);
const MAP_PLACE = {
	id: "mapbox-local-fixture-1",
	geometry: { type: "Point", coordinates: [-122.4194, 37.7749] },
	properties: {
		mapbox_id: "mapbox-local-fixture-1",
		name: "Local Test Place",
		place_formatted: "San Francisco, CA",
	},
};
const MAP_STYLE = {
	version: 8,
	sources: {},
	layers: [
		{
			id: "fixture-background",
			type: "background",
			paint: { "background-color": "#e8e1d3" },
		},
	],
};

function log(file: string, line: string) {
	mkdirSync(LOGS_DIR, { recursive: true });
	appendFileSync(path.join(LOGS_DIR, file), `${line}\n`);
}

function answered(route: Route, status: number, note: string) {
	const url = new URL(route.request().url());
	log(
		"mock-browser-responses.log",
		`${route.request().method()} ${url.host}${url.pathname} ${status} ${note}`,
	);
}

/**
 * Browser HTTPS never reaches the internet: Mapbox, images and analytics get
 * local fixtures, and local media uploads get the CORS headers the dev API
 * omits. Every HTTPS request is logged to logs/mock-browser-requests.log.
 */
export async function installLocalMocks(context: BrowserContext) {
	context.on("request", (request) => {
		const url = new URL(request.url());
		if (url.protocol === "https:")
			log(
				"mock-browser-requests.log",
				`${request.method()} ${url.hostname}${url.pathname}`,
			);
	});
	await context.route("https://**/*", (route) => route.abort());
	await context.route("https://images.example.test/**", (route) =>
		route.fulfill({ contentType: "image/png", body: PIXEL_PNG }),
	);
	await context.route("https://api.mapbox.com/**", async (route) => {
		const { pathname } = new URL(route.request().url());
		if (pathname.includes("/search/geocode/v6/forward")) {
			answered(route, 200, "fake-geocoding");
			await route.fulfill({ json: { features: [MAP_PLACE] } });
		} else if (pathname.includes("/styles/v1/")) {
			answered(route, 200, "fake-map-style");
			await route.fulfill({ json: MAP_STYLE });
		} else {
			answered(route, 204, "fake-map-resource");
			await route.fulfill({ status: 204, body: "" });
		}
	});
	await context.route("https://events.mapbox.com/**", (route) => {
		answered(route, 204, "fake-event");
		return route.fulfill({ status: 204, body: "" });
	});
	await context.route(`${API}/media/**`, async (route) => {
		if (route.request().method() === "OPTIONS") {
			await route.fulfill({
				status: 204,
				headers: {
					"Access-Control-Allow-Origin": WEB,
					"Access-Control-Allow-Credentials": "true",
					"Access-Control-Allow-Methods": "PUT, OPTIONS",
					"Access-Control-Allow-Headers": "content-type",
				},
			});
			return;
		}
		const response = await route.fetch();
		answered(route, response.status(), "local-media");
		await route.fulfill({
			response,
			headers: {
				...response.headers(),
				"Access-Control-Allow-Origin": WEB,
				"Access-Control-Allow-Credentials": "true",
			},
		});
	});
}
