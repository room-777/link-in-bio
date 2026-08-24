import type { LinkProvider } from "./link-providers";

const GITHUB_HOSTNAMES = new Set([
	"github.com",
	"www.github.com",
]);
const GITHUB_PROFILE_PATH =
	/^\/([a-z\d](?:[a-z\d-]{0,38}[a-z\d])?)\/?$/i;

type ContributionDay = {
	count: number;
	level: 0 | 1 | 2 | 3 | 4;
	color: string;
};

type ContributionWeek = {
	days: ContributionDay[];
};

type GithubGraphData = {
	totalContributions: number;
	weeks: ContributionWeek[];
};

type GithubGraphQLResponse = {
	data?: {
		user?: {
			followers: { totalCount: number };
			contributionsCollection: {
				contributionCalendar: {
					totalContributions: number;
					colors: string[];
					weeks: Array<{
						contributionDays: Array<{
							contributionCount: number;
							contributionLevel: string;
							color: string;
							weekday: number;
						}>;
					}>;
				};
			};
		};
	};
	errors?: Array<{ message?: string }>;
};

type GithubCalendar = NonNullable<
	NonNullable<
		GithubGraphQLResponse["data"]
	>["user"]
>["contributionsCollection"]["contributionCalendar"];

function getGithubUsername(
	url: URL,
): string | undefined {
	if (
		!GITHUB_HOSTNAMES.has(
			url.hostname.toLowerCase(),
		)
	)
		return undefined;
	return url.pathname.match(
		GITHUB_PROFILE_PATH,
	)?.[1];
}

function normalizeLevel(
	value: string,
): ContributionDay["level"] {
	const level = {
		NONE: 0,
		FIRST_QUARTILE: 1,
		SECOND_QUARTILE: 2,
		THIRD_QUARTILE: 3,
		FOURTH_QUARTILE: 4,
	} as const;
	return (
		level[
			value as keyof typeof level
		] ?? 0
	);
}

function createGraphData(
	calendar: GithubCalendar,
): GithubGraphData {
	const emptyColor =
		calendar.colors[0] ?? "#ebedf0";
	return {
		totalContributions:
			calendar.totalContributions,
		weeks: calendar.weeks.map(
			(week) => {
				const days: ContributionDay[] =
					Array.from(
						{ length: 7 },
						() => ({
							count: 0,
							level: 0 as const,
							color: emptyColor,
						}),
					);
				for (const day of week.contributionDays) {
					days[day.weekday] = {
						count:
							day.contributionCount,
						level: normalizeLevel(
							day.contributionLevel,
						),
						color: day.color,
					};
				}
				return { days };
			},
		),
	};
}

export function createGithubEnricher(
	fallbackEnrich: LinkProvider["enrich"],
): LinkProvider["enrich"] {
	return async (url, context) => {
		const username =
			getGithubUsername(url);
		const token =
			context.env?.GITHUB_TOKEN?.trim();
		if (!username || !token)
			return fallbackEnrich(
				url,
				context,
			);

		const controller =
			new AbortController();
		const timeout = setTimeout(
			() => controller.abort(),
			2500,
		);
		try {
			const response =
				await context.fetch(
					"https://api.github.com/graphql",
					{
						method: "POST",
						headers: {
							Accept:
								"application/json",
							Authorization: `Bearer ${token}`,
							"Content-Type":
								"application/json",
							"User-Agent":
								"Mozilla/5.0 ",
						},
						signal: controller.signal,
						body: JSON.stringify({
							query: `query ($login: String!) {
						user(login: $login) {
							followers { totalCount }
							contributionsCollection {
								contributionCalendar {
									totalContributions
									colors
									weeks {
										contributionDays {
											contributionCount
											contributionLevel
											color
											weekday
										}
									}
								}
							}
						}
					}`,
							variables: {
								login: username,
							},
						}),
					},
				);
			if (!response.ok)
				return fallbackEnrich(
					url,
					context,
				);
			const payload =
				(await response.json()) as GithubGraphQLResponse;
			const user = payload.data?.user;
			if (
				!user ||
				payload.errors?.length
			)
				return fallbackEnrich(
					url,
					context,
				);

			const graph = createGraphData(
				user.contributionsCollection
					.contributionCalendar,
			);
			const fallbackMetadata =
				await fallbackEnrich(
					url,
					context,
				);
			return {
				...fallbackMetadata,
				providerData: {
					...fallbackMetadata.providerData,
					githubUsername: username,
					followers:
						user.followers.totalCount,
					githubContributionGraph:
						JSON.stringify(graph),
				},
			};
		} catch {
			return fallbackEnrich(
				url,
				context,
			);
		} finally {
			clearTimeout(timeout);
		}
	};
}
