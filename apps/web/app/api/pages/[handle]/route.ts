import type { InferRequestType, InferResponseType } from "hono/client";
import {
  createBackendClient,
  getBackendRequestHeaders,
  parseBackendResponse,
  requestBackendWithBody,
} from "@/lib/server/backend";
import { createReadResponse, getPageByHandle } from "@/lib/server/page-queries";

type RouteContext = {
  params: Promise<{ handle: string }>;
};

export async function GET(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const { handle } = await params;
  const result = await getPageByHandle(handle, request);
  return createReadResponse(result.response);
}

export async function DELETE(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const { handle } = await params;
  const client = createBackendClient(getBackendRequestHeaders(request));
  const endpoint = client.pages[":handle"].$delete;
  const input = {
    param: { handle },
  } satisfies InferRequestType<typeof endpoint>;
  const response = await parseBackendResponse<
    InferResponseType<typeof endpoint>
  >(await endpoint(input));

  return response.response;
}

// 페이지 수정 요청을 인증 정보와 함께 백엔드로 전달합니다.
export async function PATCH(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const { handle } = await params;
  const client = createBackendClient(getBackendRequestHeaders(request));
  const endpoint = client.pages[":handle"].$patch;
  const input = { param: { handle } } satisfies Omit<
    InferRequestType<typeof endpoint>,
    "json"
  >;
  const result = await parseBackendResponse<InferResponseType<typeof endpoint>>(
    await requestBackendWithBody(endpoint, input, request.body),
  );

  return result.response;
}
