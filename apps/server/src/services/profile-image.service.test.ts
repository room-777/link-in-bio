import {
	describe,
	expect,
	it,
} from "bun:test";
import { PgDialect } from "drizzle-orm/pg-core";
import { profileImageOperationWhere } from "./profile-image.service";

describe("profile image operation concurrency", () => {
	it("compares image fields without comparing the page updated timestamp", () => {
		const where =
			profileImageOperationWhere({
				pageId: "page_1",
				userId: "user_1",
				expectedImage: {
					image: "old.webp",
					imageSource: "old.webp",
					imageCrop: {
						x: 0,
						y: 0,
						width: 100,
						height: 100,
					},
				},
			});
		expect(where).toBeDefined();
		if (!where) return;

		const query =
			new PgDialect().sqlToQuery(where);

		expect(query.sql).toContain(
			"IS NOT DISTINCT FROM",
		);
		expect(query.sql).not.toContain(
			'"pages"."updated_at"',
		);
	});
});
