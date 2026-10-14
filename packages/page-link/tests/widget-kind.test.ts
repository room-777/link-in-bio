import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getAllowedPresets } from "@grabbin/bento-layout";
import { isWidgetType, requiresProPlan } from "../src/index";

describe("isWidgetType", () => {
	it("marks only the widget item types", () => {
		assert.deepEqual(
			(
				[
					"rss",
					"tweet",
					"spotify",
					"calendly",
					"link",
					"text",
					"media",
				] as const
			).filter(isWidgetType),
			["rss", "tweet", "spotify", "calendly"],
		);
	});
});

describe("widget sizes", () => {
	it("limits Tweets to the two tall card sizes", () => {
		assert.deepEqual(getAllowedPresets("tweet"), ["portrait", "squareLarge"]);
	});

	it("gives the other widgets every card size", () => {
		const cardSizes = getAllowedPresets("link");
		for (const type of ["rss", "spotify", "calendly"] as const) {
			assert.deepEqual(getAllowedPresets(type), cardSizes, type);
		}
	});
});

describe("requiresProPlan", () => {
	it("requires Pro for every widget and coming-soon widget link", () => {
		for (const type of ["rss", "tweet", "spotify", "calendly"] as const) {
			assert.equal(requiresProPlan(type), true, type);
		}
		for (const provider of ["soundcloud", "apple-music", "calendly"]) {
			assert.equal(requiresProPlan("link", provider), true, provider);
		}
	});

	it("lets free accounts add plain links, Spotify links included", () => {
		assert.equal(requiresProPlan("link", "spotify"), false);
		assert.equal(requiresProPlan("link"), false);
		assert.equal(requiresProPlan("link", "x"), false);
		assert.equal(requiresProPlan("media"), false);
	});

	it("treats provider ids named like object keys as plain links", () => {
		for (const provider of ["__proto__", "constructor", "toString"]) {
			assert.equal(requiresProPlan("link", provider), false, provider);
		}
	});
});
