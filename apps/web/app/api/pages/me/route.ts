import { createReadResponse, getMyPage } from "@/lib/server/page-queries";

export async function GET(request: Request) {
  const result = await getMyPage(request);
  return createReadResponse(result.response);
}
