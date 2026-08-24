import { expect, it } from "bun:test";
import { mapOwnedPageSummary } from "./page.mapper";

it("maps an owned page without a persisted lifecycle status", () => {
	const page = {
		id: "page_1",
		handle: "kim",
		name: "Kim",
		image: "profile-images/page_1.webp",
		deletionScheduledAt: new Date(
			"2026-08-20T00:00:00.000Z",
		),
		createdAt: new Date(
			"2026-08-01T00:00:00.000Z",
		),
		updatedAt: new Date(
			"2026-08-02T00:00:00.000Z",
		),
	} as never;

	const summary = mapOwnedPageSummary(
		page,
		"page_1",
	);

	expect(summary).not.toHaveProperty(
		"lifecycleStatus",
	);
	expect(summary).toEqual({
		id: "page_1",
		handle: "kim",
		name: "Kim",
		image: "profile-images/page_1.webp",
		isPrimary: true,
		deletionScheduledAt:
			"2026-08-20T00:00:00.000Z",
		createdAt:
			"2026-08-01T00:00:00.000Z",
		updatedAt:
			"2026-08-02T00:00:00.000Z",
	});
});
