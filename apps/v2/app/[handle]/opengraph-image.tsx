import { headers } from "next/headers";
import { ImageResponse } from "next/og";
import { env } from "@/lib/env";
import { getPublicPageTitle } from "@/lib/handle/public-page-copy";
import { getPublicImageUrl } from "@/lib/seo-responses";
import { getPageByHandle } from "@/lib/server/page-queries";

export const alt = "Grabbin page";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

function toDataUrl(data: ArrayBuffer, contentType: string) {
  const bytes = new Uint8Array(data);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return `data:${contentType};base64,${btoa(binary)}`;
}

async function getAsset(path: string) {
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

async function getPageImageData(imageUrl: string | null, fallback: string) {
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

    return toDataUrl(await response.arrayBuffer(), contentType);
  } catch {
    return fallback;
  }
}

type ImageProps = {
  params: Promise<{ handle: string }>;
};

export default async function Image({ params }: ImageProps) {
  const { handle } = await params;
  const [logoBytes, regularFont, boldFont, pageResult] = await Promise.all([
    getAsset("/logo512.png"),
    getAsset("/fonts/Inter-Regular.ttf"),
    getAsset("/fonts/Inter-Bold.ttf"),
    getPageByHandle(handle),
  ]);
  if (!pageResult.ok && pageResult.response.status !== 404) {
    throw new Error(
      `Failed to load public page: ${pageResult.response.status}`,
    );
  }

  const logoData = toDataUrl(logoBytes, "image/png");
  const page = pageResult.ok ? pageResult.data.page : null;
  const pageName = page ? getPublicPageTitle(page) : `@${handle}`;
  const pageImageData = await getPageImageData(
    page ? getPublicImageUrl(page.image, page.updatedAt) : null,
    logoData,
  );

  return new ImageResponse(
    <div
      style={{
        background: "#ffffff",
        color: "#171717",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        position: "relative",
        width: "100%",
      }}
    >
      {/* biome-ignore lint/performance/noImgElement: ImageResponse renders images on the server. */}
      <img
        src={logoData}
        alt="Grabbin"
        width={44}
        height={44}
        style={{ left: 72, position: "absolute", top: 64 }}
      />
      <span
        style={{
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: 34,
          fontWeight: 700,
          left: 126,
          lineHeight: "44px",
          position: "absolute",
          top: 64,
        }}
      >
        Grabbin
      </span>
      <div
        style={{
          alignItems: "center",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Inter, Arial, sans-serif",
          justifyContent: "center",
          left: 0,
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
        }}
      >
        {/* biome-ignore lint/performance/noImgElement: ImageResponse renders images on the server. */}
        <img
          src={pageImageData}
          alt=""
          width={180}
          height={180}
          style={{ borderRadius: "50%", objectFit: "cover" }}
        />
        <span
          style={{
            fontSize: 48,
            fontWeight: 700,
            lineHeight: "58px",
            marginTop: 32,
            maxWidth: 900,
            textAlign: "center",
          }}
        >
          {pageName}
        </span>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          data: regularFont,
          name: "Inter",
          style: "normal",
          weight: 400,
        },
        {
          data: boldFont,
          name: "Inter",
          style: "normal",
          weight: 700,
        },
      ],
    },
  );
}
