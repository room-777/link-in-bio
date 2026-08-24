import {
	describe,
	expect,
	it,
} from "bun:test";
import { PRO_MONTHLY_PRODUCT_ID } from "@grabbin/plan";
import {
	buildPlanAccess,
	getPlanAccess,
} from "./billing";

const now = new Date(
	"2026-08-13T00:00:00.000Z",
);
const subscription = (
	overrides: Record<
		string,
		unknown
	> = {},
) => ({
	status: "active",
	productId: PRO_MONTHLY_PRODUCT_ID,
	periodStart: new Date(
		"2026-08-01T00:00:00.000Z",
	),
	periodEnd: new Date(
		"2026-09-01T00:00:00.000Z",
	),
	cancelAtPeriodEnd: false,
	...overrides,
});

describe("plan access", () => {
	it("recognizes an allowed active Pro product", () => {
		expect(
			buildPlanAccess(
				[subscription()],
				now,
			),
		).toMatchObject({
			tier: "pro",
			hasAccess: true,
		});
	});

	it("keeps canceled access through periodEnd", () => {
		expect(
			buildPlanAccess(
				[
					subscription({
						status: "canceled",
					}),
				],
				now,
			),
		).toMatchObject({
			tier: "pro",
			hasAccess: true,
		});
	});

	it("switches to Free after periodEnd", () => {
		expect(
			buildPlanAccess(
				[
					subscription({
						status: "canceled",
						periodEnd: new Date(
							"2026-08-01T00:00:00.000Z",
						),
					}),
				],
				now,
			),
		).toMatchObject({
			tier: "free",
			hasAccess: false,
		});
	});

	it("does not treat an unknown product as Pro", () => {
		expect(
			buildPlanAccess(
				[
					subscription({
						productId: "prod_unknown",
					}),
				],
				now,
			).tier,
		).toBe("free");
	});

	it("reports grace only for expired Pro pages awaiting cleanup", async () => {
		const db = {
			query: {
				creemSubscription: {
					findMany: async () => [
						subscription({
							status: "canceled",
							periodEnd: new Date(
								"2026-08-01T00:00:00.000Z",
							),
						}),
					],
				},
				pages: {
					findMany: async () => [
						{ id: "page_1" },
					],
				},
			},
		} as never;

		expect(
			await getPlanAccess({
				db,
				userId: "user_1",
				now,
			}),
		).toMatchObject({
			tier: "free",
			gracePeriod: true,
		});
	});
});
