import { env } from "@/lib/env";

const SIMPLE_ANALYTICS_API_URL = "https://simpleanalytics.com";
const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map<string, { value: PublicViews; expiresAt: number }>();

export type PublicViews = {
  todayViews: number | null;
  yesterdayViews: number | null;
};

function getLocalDates(timezone: string) {
  let validTimezone = timezone;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: validTimezone });
  } catch {
    validTimezone = "UTC";
  }

  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: validTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, Number(value)]),
  ) as { year: number; month: number; day: number };
  const localDate = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
  const yesterday = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day - 1),
  );

  return {
    timezone: validTimezone,
    localDate,
    yesterdayDate: `${yesterday.getUTCFullYear()}-${String(yesterday.getUTCMonth() + 1).padStart(2, "0")}-${String(yesterday.getUTCDate()).padStart(2, "0")}`,
  };
}

async function getPageviews(pageId: string, timezone: string, date: string) {
  const hostname = env.NEXT_PUBLIC_APP_DOMAIN;
  const url = new URL(`${SIMPLE_ANALYTICS_API_URL}/${hostname}.json`);
  url.searchParams.set("version", "6");
  url.searchParams.set("fields", "pageviews");
  url.searchParams.set("start", date);
  url.searchParams.set("end", date);
  url.searchParams.set("timezone", timezone);
  url.searchParams.set("pages", `/__analytics/pages/${pageId}`);

  try {
    const response = await fetch(url, {
      headers: { "Api-Key": env.SIMPLE_ANALYTICS_API_KEY },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { pageviews?: unknown };
    return typeof data.pageviews === "number" ? data.pageviews : null;
  } catch {
    return null;
  }
}

export async function getPublicViews(pageId: string, timezone: string) {
  const dates = getLocalDates(timezone);
  const key = `${pageId}:${dates.timezone}:${dates.localDate}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const [todayViews, yesterdayViews] = await Promise.all([
    getPageviews(pageId, dates.timezone, dates.localDate),
    getPageviews(pageId, dates.timezone, dates.yesterdayDate),
  ]);
  const value = { todayViews, yesterdayViews };
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}
