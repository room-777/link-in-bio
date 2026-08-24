import { env } from "@/lib/env";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function isAllowedImageUrl(imageUrl: URL) {
  const publicBaseUrl = env.NEXT_PUBLIC_R2_PUBLIC_URL?.trim();
  if (!publicBaseUrl) return false;

  try {
    const baseUrl = new URL(publicBaseUrl);
    const basePath = baseUrl.pathname.replace(/\/+$/, "");

    return (
      imageUrl.origin === baseUrl.origin &&
      (imageUrl.pathname === basePath ||
        imageUrl.pathname.startsWith(`${basePath}/`))
    );
  } catch {
    return false;
  }
}

// 허용된 R2 공개 이미지만 받아 검증 후 브라우저에 전달합니다.
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const imageParameter = requestUrl.searchParams.get("url");
  if (!imageParameter) {
    return new Response("Missing image URL.", { status: 400 });
  }

  let imageUrl: URL;
  try {
    imageUrl = new URL(imageParameter);
  } catch {
    return new Response("Invalid image URL.", { status: 400 });
  }

  if (
    (imageUrl.protocol !== "http:" && imageUrl.protocol !== "https:") ||
    !isAllowedImageUrl(imageUrl)
  ) {
    return new Response("Invalid image URL.", { status: 400 });
  }

  let imageResponse: Response;
  try {
    imageResponse = await fetch(imageUrl, {
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return new Response("Image unavailable.", { status: 502 });
  }

  if (!imageResponse.ok) {
    return new Response("Image unavailable.", { status: 502 });
  }

  const contentType = imageResponse.headers
    .get("content-type")
    ?.split(";", 1)[0]
    .trim();
  if (!contentType?.startsWith("image/")) {
    return new Response("Invalid image.", { status: 400 });
  }

  const imageBytes = new Uint8Array(await imageResponse.arrayBuffer());
  if (imageBytes.byteLength < 1 || imageBytes.byteLength > MAX_IMAGE_BYTES) {
    return new Response("Image is too large.", { status: 413 });
  }

  return new Response(imageBytes, {
    headers: {
      "cache-control": "private, max-age=300",
      "content-length": String(imageBytes.byteLength),
      "content-type": contentType,
    },
  });
}
