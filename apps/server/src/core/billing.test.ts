import {
	describe,
	expect,
	it,
} from "bun:test";
import { buildBillingStatus } from "./billing";

describe("billing status", () => {
	it("returns none when the user has no subscription", () => {
		expect(
			buildBillingStatus([]),
		).toEqual({
			status: "none",
			hasAccess: false,
		});
	});

	it("keeps access during a canceled paid period", () => {
		const result = buildBillingStatus(
			[
				{
					status: "canceled",
					periodStart: new Date(
						"2026-08-01T00:00:00Z",
					),
					periodEnd: new Date(
						"2026-09-01T00:00:00Z",
					),
					productId: "prod_10k",
					cancelAtPeriodEnd: true,
				},
			],
			new Date("2026-08-13T00:00:00Z"),
		);

		expect(result).toMatchObject({
			status: "canceled",
			hasAccess: true,
			productId: "prod_10k",
			cancelAtPeriodEnd: true,
		});
	});

	it("does not grant access after the period ends", () => {
		const result = buildBillingStatus(
			[
				{
					status: "canceled",
					periodStart: new Date(
						"2026-07-01T00:00:00Z",
					),
					periodEnd: new Date(
						"2026-08-01T00:00:00Z",
					),
					productId: "prod_10k",
					cancelAtPeriodEnd: true,
				},
			],
			new Date("2026-08-13T00:00:00Z"),
		);

		expect(result.hasAccess).toBe(
			false,
		);
	});
});
