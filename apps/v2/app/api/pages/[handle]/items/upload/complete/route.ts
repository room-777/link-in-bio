import type { InferRequestType, InferResponseType } from "hono/client";
import {
  createBackendClient,
  getBackendRequestHeaders,
  parseBackendResponse,
  requestBackendWithBody,
} from "@/lib/server/backend";

type RouteContext = {
  params: Promise<{ handle: string }>;
};

// R2에 업로드된 Grid 미디어를 백엔드에 완료 처리하도록 전달합니다.
export async function POST(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const { handle } = await params;
  const client = createBackendClient(getBackendRequestHeaders(request));
  const endpoint = client.pages[":handle"].items.upload.complete.$post;
  const input = { param: { handle } } satisfies Omit<
    InferRequestType<typeof endpoint>,
    "json"
  >;
  const result = await parseBackendResponse<InferResponseType<typeof endpoint>>(
    await requestBackendWithBody(endpoint, input, request.body),
  );

  return result.response;
}
