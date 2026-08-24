import { getPublicViews } from "@/lib/server/public-views";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pageId = url.searchParams.get("pageId");
  const timezone = url.searchParams.get("timezone") ?? "UTC";
  if (!pageId)
    return Response.json(
      { todayViews: null, yesterdayViews: null },
      { status: 400 },
    );

  return Response.json(await getPublicViews(pageId, timezone), {
    headers: { "cache-control": "private, no-store" },
  });
}
