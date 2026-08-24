import { env } from "@/lib/env";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function fallbackIcon() {
  return new Response(null, {
    status: 307,
    headers: { location: "/icon.svg" },
  });
}

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

function escapeXml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[character] ?? character,
  );
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

export async function GET(request: Request) {
  const imageParameter = new URL(request.url).searchParams.get("image");
  if (!imageParameter) return fallbackIcon();

  let imageUrl: URL;
  try {
    imageUrl = new URL(imageParameter);
  } catch {
    return fallbackIcon();
  }

  if (
    (imageUrl.protocol !== "http:" && imageUrl.protocol !== "https:") ||
    !isAllowedImageUrl(imageUrl)
  ) {
    return fallbackIcon();
  }

  let imageResponse: Response;
  try {
    imageResponse = await fetch(imageUrl, {
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    return fallbackIcon();
  }
  if (!imageResponse.ok) return fallbackIcon();

  const contentLength = Number.parseInt(
    imageResponse.headers.get("content-length") ?? "",
    10,
  );
  if (
    Number.isSafeInteger(contentLength) &&
    (contentLength < 1 || contentLength > MAX_IMAGE_BYTES)
  ) {
    return fallbackIcon();
  }

  const contentType = imageResponse.headers
    .get("content-type")
    ?.split(";", 1)[0]
    .trim();
  if (!contentType?.startsWith("image/")) return fallbackIcon();

  const imageBytes = new Uint8Array(await imageResponse.arrayBuffer());
  if (imageBytes.byteLength > MAX_IMAGE_BYTES) return fallbackIcon();

  const imageData = `data:${contentType};base64,${toBase64(imageBytes)}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<defs><clipPath id="circle"><circle cx="32" cy="32" r="32" /></clipPath></defs>
<image href="${escapeXml(imageData)}" width="64" height="64" preserveAspectRatio="xMidYMid slice" clip-path="url(#circle)" />
</svg>`;

  return new Response(svg, {
    headers: {
      "cache-control": "public, max-age=31536000, immutable",
      "content-type": "image/svg+xml",
    },
  });
}
