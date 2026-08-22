export type PlanPeriod = "monthly" | "yearly";

export const FREE_PAGE_LIMIT = 1;
export const PRO_PAGE_LIMIT = 3;

export const PRO_PLANS = {
	monthly: {
		productId: "prod_GSK39navdTU71bXQBHraL",
		label: "Monthly",
		price: "$6",
		suffix: "/month",
	},
	yearly: {
		productId: "prod_2Uz7Eh1vsEpfdWCwfXYPHV",
		label: "Yearly",
		price: "$60",
		suffix: "/year",
	},
} as const satisfies Record<
	PlanPeriod,
	{
		productId: string;
		label: string;
		price: string;
		suffix: string;
	}
>;

export const PRO_MONTHLY_PRODUCT_ID = PRO_PLANS.monthly.productId;
export const PRO_PRODUCT_IDS = new Set<string>([
	PRO_MONTHLY_PRODUCT_ID,
	PRO_PLANS.yearly.productId,
]);
