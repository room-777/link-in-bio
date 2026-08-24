import { checkPageHandle, createReadResponse } from "@/lib/server/page-queries";

export async function GET(request: Request) {
  const handle = new URL(request.url).searchParams.get("handle") ?? "";
  const result = await checkPageHandle(handle, request);
  return createReadResponse(result.response);
}
