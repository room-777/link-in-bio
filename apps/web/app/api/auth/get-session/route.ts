import { createReadResponse, getSession } from "@/lib/server/page-queries";

export async function GET(request: Request) {
  const result = await getSession(request);
  return createReadResponse(result.response);
}
