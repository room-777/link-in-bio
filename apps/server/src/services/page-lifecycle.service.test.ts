import {
	describe,
	expect,
	it,
} from "bun:test";
import {
	assertPageWritable,
	getPageDeletionDeadline,
} from "./page-lifecycle.service";

describe("page lifecycle", () => {
	it("allows the primary page to be edited without plan access", async () => {
		const db = {
			query: {
				creemSubscription: {
					findMany: async () => [],
				},
				user: {
					findFirst: async () => ({
						primaryPageId: "page_primary",
					}),
				},
				pages: {
					findMany: async () => [
						{ id: "page_primary" },
						{ id: "page_secondary" },
					],
				},
			},
		} as never;

		await expect(
			assertPageWritable({
				db,
				userId: "user_1",
				page: { id: "page_primary" },
			}),
		).resolves.toBeUndefined();
	});

	it("schedules deletion seven days after period end", () => {
		const periodEnd = new Date(
			"2026-08-13T00:00:00.000Z",
		);
		expect(
			getPageDeletionDeadline(
				periodEnd,
			),
		).toEqual(
			new Date(
				"2026-08-20T00:00:00.000Z",
			),
		);
	});
});
