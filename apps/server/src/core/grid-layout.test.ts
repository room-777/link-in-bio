import {
	describe,
	expect,
	it,
} from "bun:test";
import {
	compactWithGravity,
	getAllowedPresets,
	getPresetGeometry,
	placeAtFirstAvailable,
	resolveAxisAwareSwap,
	validateLayout,
	validateLayoutForItem,
} from "@grabbin/grid-layout";

describe("grid layout domain", () => {
	it("returns the planned preset matrix and breakpoint geometry", () => {
		expect(
			getAllowedPresets("section"),
		).toEqual(["fullBanner"]);
		expect(
			getAllowedPresets("text"),
		).not.toContain("fullBanner");
		expect(
			getPresetGeometry(
				"fullBanner",
				"wide",
			),
		).toEqual({
			x: 0,
			y: 0,
			w: 4,
			h: 1,
		});
		expect(
			getPresetGeometry(
				"fullBanner",
				"compact",
			),
		).toEqual({
			x: 0,
			y: 0,
			w: 2,
			h: 1,
		});
	});

	it("places a new item at the first legal position", () => {
		expect(
			placeAtFirstAvailable(
				{
					a: { x: 0, y: 0, w: 2, h: 1 },
				},
				{ w: 2, h: 1 },
				4,
			),
		).toEqual({
			x: 2,
			y: 0,
			w: 2,
			h: 1,
		});
	});

	it("compacts unsupported items while preserving supported partial layouts", () => {
		const result = compactWithGravity(
			{
				a: { x: 0, y: 0, w: 1, h: 1 },
				b: { x: 2, y: 0, w: 1, h: 1 },
				c: { x: 1, y: 1, w: 2, h: 1 },
			},
			4,
		);

		expect(result.c).toEqual({
			x: 1,
			y: 1,
			w: 2,
			h: 1,
		});
	});

	it("swaps anchors along the dominant drag axis", () => {
		const vertical =
			resolveAxisAwareSwap(
				{
					a: { x: 0, y: 0, w: 2, h: 1 },
					b: { x: 0, y: 1, w: 2, h: 1 },
				},
				"b",
				{ x: 0, y: 0, w: 2, h: 1 },
				{ x: 0, y: -1 },
				4,
			);
		expect(vertical.a.y).toBe(1);
		expect(vertical.b.y).toBe(0);

		const horizontal =
			resolveAxisAwareSwap(
				{
					a: { x: 0, y: 0, w: 1, h: 1 },
					b: { x: 1, y: 0, w: 1, h: 1 },
				},
				"b",
				{ x: 0, y: 0, w: 1, h: 1 },
				{ x: -1, y: 0 },
				4,
			);
		expect(horizontal.a.x).toBe(1);
		expect(horizontal.b.x).toBe(0);
	});

	it("uses the first crossed axis for an equal diagonal movement", () => {
		const result = resolveAxisAwareSwap(
			{
				a: { x: 0, y: 0, w: 1, h: 1 },
				b: { x: 1, y: 1, w: 1, h: 1 },
			},
			"b",
			{ x: 0, y: 0, w: 1, h: 1 },
			{
				x: -1,
				y: -1,
				firstCrossedAxis: "y",
			},
			4,
		);
		expect(result.a.y).toBe(1);
	});

	it("falls back to the nearest legal position for unequal footprints", () => {
		const result = resolveAxisAwareSwap(
			{
				a: { x: 0, y: 0, w: 1, h: 1 },
				b: { x: 1, y: 0, w: 2, h: 2 },
			},
			"b",
			{ x: 0, y: 0, w: 2, h: 2 },
			{ x: -1, y: 0 },
			4,
		);

		validateLayout(result, 4);
		expect(result.b).toEqual({
			x: 0,
			y: 0,
			w: 2,
			h: 2,
		});
		expect(
			result.a.x,
		).toBeGreaterThanOrEqual(2);
	});

	it("rejects unsupported presets and invalid geometry", () => {
		expect(() =>
			validateLayoutForItem(
				{
					type: "section",
					preset: "halfBanner",
					layout: {
						x: 0,
						y: 0,
						w: 2,
						h: 1,
					},
				},
				"wide",
			),
		).toThrow();
		expect(() =>
			validateLayout(
				{
					a: { x: 0, y: 0, w: 3, h: 1 },
					b: { x: 2, y: 0, w: 2, h: 1 },
				},
				4,
			),
		).toThrow();
		expect(() =>
			placeAtFirstAvailable(
				{},
				{ w: 5, h: 1 },
				4,
			),
		).toThrow();
	});
});
