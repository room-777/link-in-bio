import { getPublicPageTitle } from "@/lib/handle/public-page-copy";
import {
  createOpenGraphSvg,
  getOpenGraphAsset,
  getOpenGraphImageData,
  OPEN_GRAPH_CONTENT_TYPE,
  toBase64,
} from "@/lib/seo/open-graph-svg";
import { getPublicImageUrl } from "@/lib/seo-responses";
import { getPageByHandle } from "@/lib/server/page-queries";

export const alt = "Grabbin page";
export const size = { width: 1200, height: 630 };
export const contentType = "image/svg+xml";
export const dynamic = "force-dynamic";

type ImageProps = {
  params: Promise<{ handle: string }>;
};

export default async function Image({ params }: ImageProps) {
  const { handle } = await params;
  const [logoBytes, regularFont, boldFont, pageResult] = await Promise.all([
    getOpenGraphAsset("/logo512.png"),
    getOpenGraphAsset("/fonts/Inter-Regular.ttf"),
    getOpenGraphAsset("/fonts/Inter-Bold.ttf"),
    getPageByHandle(handle),
  ]);
  if (!pageResult.ok && pageResult.response.status !== 404) {
    throw new Error(
      `Failed to load public page: ${pageResult.response.status}`,
    );
  }

  const logoData = `data:image/png;base64,${toBase64(logoBytes)}`;
  const page = pageResult.ok ? pageResult.data.page : null;
  const pageName = page ? getPublicPageTitle(page) : `@${handle}`;
  const pageImageData = await getOpenGraphImageData(
    page ? getPublicImageUrl(page.image, page.updatedAt) : null,
    logoData,
  );

  return new Response(
    createOpenGraphSvg({
      boldFontData: toBase64(boldFont),
      logoData,
      pageImageData,
      pageName,
      regularFontData: toBase64(regularFont),
    }),
    {
      headers: {
        "Cache-Control": "public, max-age=300",
        "Content-Type": OPEN_GRAPH_CONTENT_TYPE,
      },
    },
  );
}
