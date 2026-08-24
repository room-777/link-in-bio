import {
	describe,
	expect,
	it,
} from "bun:test";
import { createProductHuntEnricher } from "./product-hunt-link-provider";

describe("Product Hunt link provider", () => {
	it("fetches the latest launch's upvote count for a Product Page", async () => {
		let request: Request | undefined;
		const enrich =
			createProductHuntEnricher(
				async () => ({
					title: "fallback",
				}),
			);

		const metadata = await enrich(
			new URL(
				"https://www.producthunt.com/products/linear",
			),
			{
				env: {
					PRODUCT_HUNT_TOKEN:
						"product-hunt-token",
				},
				fetch: async (input, init) => {
					request = new Request(
						input,
						init,
					);
					return new Response(
						JSON.stringify({
							data: {
								post: {
									name: "Linear",
									tagline:
										"The issue tracking tool you'll enjoy using",
									votesCount: 1234,
									thumbnail: {
										url: "https://cdn.example.com/linear.png",
									},
								},
							},
						}),
						{
							headers: {
								"content-type":
									"application/json",
							},
						},
					);
				},
			},
		);

		expect(request?.url).toBe(
			"https://api.producthunt.com/v2/api/graphql",
		);
		expect(
			request?.headers.get(
				"Authorization",
			),
		).toBe("Bearer product-hunt-token");
		expect(request?.method).toBe(
			"POST",
		);
		if (!request)
			throw new Error(
				"Product Hunt request was not made",
			);
		const body = await request.json();
		expect(body).toEqual({
			query:
				"query ($slug: String!) { post(slug: $slug) { name tagline votesCount thumbnail { url } } }",
			variables: { slug: "linear" },
		});
		expect(metadata).toEqual({
			title: "Linear",
			description:
				"The issue tracking tool you'll enjoy using",
			imageUrl:
				"https://cdn.example.com/linear.png",
			providerData: {
				upvoteCount: 1234,
			},
		});
	});

	it("falls back without fetching for launch URLs and missing tokens", async () => {
		let fetchCalled = false;
		const enrich =
			createProductHuntEnricher(
				async () => ({
					title: "fallback",
				}),
			);
		const fetchApi = async () => {
			fetchCalled = true;
			throw new Error("must not fetch");
		};

		expect(
			await enrich(
				new URL(
					"https://www.producthunt.com/posts/linear",
				),
				{ fetch: fetchApi },
			),
		).toEqual({ title: "fallback" });
		expect(
			await enrich(
				new URL(
					"https://www.producthunt.com/products/linear",
				),
				{ fetch: fetchApi },
			),
		).toEqual({ title: "fallback" });
		expect(fetchCalled).toBe(false);
	});

	it("falls back when the GraphQL response has errors or no latest launch", async () => {
		const enrich =
			createProductHuntEnricher(
				async () => ({
					title: "fallback",
				}),
			);
		let requestCount = 0;
		const fetchApi = async () => {
			requestCount += 1;
			return new Response(
				JSON.stringify({
					data: { post: null },
					errors: [
						{
							message: "Post not found",
						},
					],
				}),
				{
					headers: {
						"content-type":
							"application/json",
					},
				},
			);
		};

		expect(
			await enrich(
				new URL(
					"https://producthunt.com/products/linear",
				),
				{
					env: {
						PRODUCT_HUNT_TOKEN:
							"product-hunt-token",
					},
					fetch: fetchApi,
				},
			),
		).toEqual({ title: "fallback" });
		expect(requestCount).toBe(1);
	});
});
