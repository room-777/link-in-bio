import { pageItemBatchResponseSchema } from "@grabbin/api";
import { fetchBackend, getBackendRequestHeaders } from "@/lib/server/backend";

type RouteContext = { params: Promise<{ handle: string }> };

export async function PATCH(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const { handle } = await params;
  const headers = getBackendRequestHeaders(request);
  headers.set("content-type", "application/json");
  return (
    await fetchBackend(
      `/pages/${encodeURIComponent(handle)}/batch`,
      { method: "PATCH", headers, body: request.body },
      pageItemBatchResponseSchema,
    )
  ).response;
}
