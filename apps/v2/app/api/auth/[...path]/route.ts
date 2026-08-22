import type { InferRequestType } from "hono/client";
import {
  createBackendClient,
  getBackendRequestHeaders,
  toResponse,
} from "@/lib/server/backend";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function forwardAuthRequest(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const { path } = await params;
  const client = createBackendClient(getBackendRequestHeaders(request));
  const authClient = client.auth[":path{.+}"];
  const input = {
    param: { path: path.join("/") },
  } satisfies InferRequestType<typeof authClient.$get>;
  const init =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : {
          init: {
            body: request.body,
            duplex: "half" as const,
          },
        };

  const response: Awaited<
    ReturnType<
      | typeof authClient.$get
      | typeof authClient.$post
      | typeof authClient.$patch
      | typeof authClient.$delete
    >
  > =
    request.method === "GET"
      ? await authClient.$get(input, init)
      : request.method === "POST"
        ? await authClient.$post(input, init)
        : request.method === "PATCH"
          ? await authClient.$patch(input, init)
          : await authClient.$delete(input, init);

  return toResponse(response);
}

export const GET = forwardAuthRequest;
export const POST = forwardAuthRequest;
export const PATCH = forwardAuthRequest;
export const DELETE = forwardAuthRequest;
