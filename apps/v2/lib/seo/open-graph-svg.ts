import { headers } from "next/headers";
import { env } from "@/lib/env";

export const OPEN_GRAPH_CONTENT_TYPE = "image/svg+xml; charset=utf-8";

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

export function toBase64(data: ArrayBuffer) {
  const bytes = new Uint8Array(data);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

export async function getOpenGraphAsset(path: string) {
  const assets = env.ASSETS;
  if (assets) {
    const response = await assets.fetch(`https://assets.local${path}`);
    if (response.ok) return response.arrayBuffer();
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  if (!host) throw new Error("OG image asset host is unavailable.");

  const protocol =
    requestHeaders.get("x-forwarded-proto")?.split(",", 1)[0] || "http";
  const response = await fetch(`${protocol}://${host}${path}`);
  if (!response.ok) {
    throw new Error(`OG image asset unavailable: ${path}`);
  }

  return response.arrayBuffer();
}

export async function getOpenGraphImageData(
  imageUrl: string | null,
  fallback: string,
) {
  if (!imageUrl) return fallback;

  try {
    const response = await fetch(imageUrl, {
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return fallback;

    const contentType = response.headers
      .get("content-type")
      ?.split(";", 1)[0]
      .trim();
    if (!contentType?.startsWith("image/")) return fallback;

    return `data:${contentType};base64,${toBase64(await response.arrayBuffer())}`;
  } catch {
    return fallback;
  }
}

export function createOpenGraphSvg({
  logoData,
  regularFontData,
  boldFontData,
  pageImageData,
  pageName,
}: {
  logoData: string;
  regularFontData: string;
  boldFontData: string;
  pageImageData?: string;
  pageName?: string;
}) {
  const pageContent = pageName
    ? `
      <clipPath id="page-image-clip">
        <circle cx="600" cy="245" r="90" />
      </clipPath>
      <image
        href="${pageImageData ?? logoData}"
        x="510"
        y="155"
        width="180"
        height="180"
        preserveAspectRatio="xMidYMid slice"
        clip-path="url(#page-image-clip)"
      />
      <text
        x="600"
        y="395"
        text-anchor="middle"
        font-family="Inter, Arial, sans-serif"
        font-size="48"
        font-weight="700"
        fill="#171717"
      >${escapeXml(pageName)}</text>
    `
    : `
      <g
        font-family="Inter, Arial, sans-serif"
        font-size="60"
        font-weight="700"
        fill="#171717"
      >
        <text x="72" y="500">A cleaner, more beautiful</text>
        <text x="72" y="562">Link in Bio</text>
      </g>
    `;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <style>
      @font-face { font-family: Inter; font-weight: 400; src: url(data:font/ttf;base64,${regularFontData}); }
      @font-face { font-family: Inter; font-weight: 700; src: url(data:font/ttf;base64,${boldFontData}); }
    </style>
    <rect width="1200" height="630" fill="#ffffff" />
    <image href="${logoData}" x="72" y="64" width="44" height="44" />
    <text x="126" y="98" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="700" fill="#171717">Grabbin</text>
    ${pageContent}
  </svg>`;
}
