const MEDIA_IMAGE_WIDTHS = [320, 480, 640, 828, 1080, 1440, 1920] as const;

function getOptimizedMediaUrl(source: string, width: number) {
  const params = new URLSearchParams({
    url: source,
    w: String(width),
    q: "75",
  });
  return `/_next/image?${params.toString()}`;
}

export function getMediaImageSources(source: string) {
  if (!/^https?:\/\//i.test(source)) {
    return { src: source, srcSet: undefined };
  }

  return {
    src: getOptimizedMediaUrl(source, 640),
    srcSet: MEDIA_IMAGE_WIDTHS.map(
      (width) => `${getOptimizedMediaUrl(source, width)} ${width}w`,
    ).join(", "),
  };
}
