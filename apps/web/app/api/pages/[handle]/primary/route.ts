import type { InferRequestType, InferResponseType } from "hono/client";
import {
  createBackendClient,
  getBackendRequestHeaders,
  parseBackendResponse,
} from "@/lib/server/backend";

type RouteContext = {
  params: Promise<{ handle: string }>;
};

export async function PATCH(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const { handle } = await params;
  const client = createBackendClient(getBackendRequestHeaders(request));
  const endpoint = client.pages[":handle"].primary.$patch;
  const input = {
    param: { handle },
  } satisfies InferRequestType<typeof endpoint>;
  return (
    await parseBackendResponse<InferResponseType<typeof endpoint>>(
      await endpoint(input),
    )
  ).response;
}
