import type { PageItemLinkMetadata } from "@grabbin/api";
import {
	asNumber,
	asRecord,
	asString,
	fetchJson,
	getHttpsUrl,
	getProviderData,
} from "./runtime";
import type { LinkProviderContext, LinkProviderTarget } from "./types";

async function getGithubContributionGraph(
	username: string,
	context: LinkProviderContext,
) {
	const token = asString(context.env?.GITHUB_TOKEN);
	if (!token) return undefined;
	const payload = asRecord(
		await fetchJson("https://api.github.com/graphql", context, {
			method: "POST",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
				"User-Agent": "Grabbin Link Preview/1.0",
			},
			body: JSON.stringify({
				query:
					"query ($login: String!) { user(login: $login) { contributionsCollection { contributionCalendar { totalContributions colors weeks { contributionDays { contributionCount contributionLevel color weekday } } } } } }",
				variables: { login: username },
			}),
		}),
	);
	const data = asRecord(payload?.data);
	const user = asRecord(data?.user);
	const collection = asRecord(user?.contributionsCollection);
	const calendar = asRecord(collection?.contributionCalendar);
	const weeks = Array.isArray(calendar?.weeks) ? calendar.weeks : undefined;
	if (typeof calendar?.totalContributions !== "number" || !weeks)
		return undefined;
	const levels: Record<string, 0 | 1 | 2 | 3 | 4> = {
		NONE: 0,
		FIRST_QUARTILE: 1,
		SECOND_QUARTILE: 2,
		THIRD_QUARTILE: 3,
		FOURTH_QUARTILE: 4,
	};
	const colors = Array.isArray(calendar.colors)
		? calendar.colors.filter(
				(color): color is string => typeof color === "string",
			)
		: [];
	return JSON.stringify({
		totalContributions: calendar.totalContributions,
		weeks: weeks.map((week) => {
			const weekRecord = asRecord(week);
			const days = Array.from({ length: 7 }, (_, weekday) => ({
				count: 0,
				level: 0,
				color: colors[0] ?? "#ebedf0",
				weekday,
			}));
			const contributionDays = Array.isArray(weekRecord?.contributionDays)
				? weekRecord.contributionDays
				: [];
			for (const value of contributionDays) {
				const day = asRecord(value);
				const weekday = asNumber(day?.weekday);
				if (weekday === undefined || weekday < 0 || weekday > 6) continue;
				days[weekday] = {
					count: asNumber(day?.contributionCount) ?? 0,
					level: levels[asString(day?.contributionLevel) ?? ""] ?? 0,
					color: asString(day?.color) ?? colors[0] ?? "#ebedf0",
					weekday,
				};
			}
			return { days };
		}),
	});
}

export async function enrichGithub(
	_url: URL,
	target: LinkProviderTarget,
	context: LinkProviderContext,
): Promise<Partial<PageItemLinkMetadata>> {
	const username =
		target.kind === "profile" ? target.params.username : undefined;
	if (!username) return {};
	const headers: HeadersInit = {
		Accept: "application/vnd.github+json",
		"User-Agent": "Grabbin Link Preview/1.0",
	};
	const token = asString(context.env?.GITHUB_TOKEN);
	if (token) headers.Authorization = `Bearer ${token}`;
	const user = asRecord(
		await fetchJson(
			`https://api.github.com/users/${encodeURIComponent(username)}`,
			context,
			{ headers },
		),
	);
	if (!user) return {};
	return {
		title: asString(user.name) ?? username,
		description: asString(user.bio),
		imageUrl: getHttpsUrl(user.avatar_url),
		providerData: getProviderData({
			githubUsername: username,
			followers: asNumber(user.followers),
			githubContributionGraph: await getGithubContributionGraph(
				username,
				context,
			),
		}),
	};
}
