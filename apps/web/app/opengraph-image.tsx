import {
  createOpenGraphSvg,
  getOpenGraphAsset,
  OPEN_GRAPH_CONTENT_TYPE,
  toBase64,
} from "@/lib/seo/open-graph-svg";

export const alt = "Grabbin — A Link in Bio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/svg+xml";
export const dynamic = "force-dynamic";

export default async function Image() {
  const [logoBytes, regularFont, boldFont] = await Promise.all([
    getOpenGraphAsset("/logo512.png"),
    getOpenGraphAsset("/fonts/Inter-Regular.ttf"),
    getOpenGraphAsset("/fonts/Inter-Bold.ttf"),
  ]);
  const logoData = `data:image/png;base64,${toBase64(logoBytes)}`;

  return new Response(
    createOpenGraphSvg({
      boldFontData: toBase64(boldFont),
      logoData,
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
