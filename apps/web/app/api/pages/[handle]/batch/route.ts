import type { InferRequestType, InferResponseType } from "hono/client";
import {
  createBackendClient,
  getBackendRequestHeaders,
  parseBackendResponse,
  requestBackendWithBody,
} from "@/lib/server/backend";

type RouteContext = { params: Promise<{ handle: string }> };

export async function PATCH(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const { handle } = await params;
  const client = createBackendClient(getBackendRequestHeaders(request));
  const endpoint = client.pages[":handle"].batch.$patch;
  const input = { param: { handle } } satisfies Omit<
    InferRequestType<typeof endpoint>,
    "json"
  >;
  return (
    await parseBackendResponse<InferResponseType<typeof endpoint>>(
      await requestBackendWithBody(endpoint, input, request.body),
    )
  ).response;
}
