import {
  createPage,
  createReadResponse,
  getOwnedPages,
} from "@/lib/server/page-queries";

export async function GET(request: Request) {
  const result = await getOwnedPages(request);
  return createReadResponse(result.response);
}

export async function POST(request: Request) {
  const result = await createPage(await request.json(), request);
  return createReadResponse(result.response);
}
