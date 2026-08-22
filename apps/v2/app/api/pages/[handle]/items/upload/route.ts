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

// Grid 미디어 업로드 시작 요청을 백엔드로 전달해 presigned URL을 받습니다.
export async function POST(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const { handle } = await params;
  const client = createBackendClient(getBackendRequestHeaders(request));
  const endpoint = client.pages[":handle"].items.upload.$post;
  const input = { param: { handle } } satisfies Omit<
    InferRequestType<typeof endpoint>,
    "json"
  >;
  const result = await parseBackendResponse<InferResponseType<typeof endpoint>>(
    await requestBackendWithBody(endpoint, input, request.body),
  );

  return result.response;
}
