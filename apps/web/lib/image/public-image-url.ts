export function createPublicImageUrl(
  image: string | null,
  updatedAt: string,
  publicBaseUrl: string | null | undefined,
) {
  if (!image) return null;
  const baseUrl = publicBaseUrl?.trim();
  if (!baseUrl) return null;

  const url = `${baseUrl.replace(/\/+$/, "")}/${image
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
  return `${url}?v=${encodeURIComponent(updatedAt)}`;
}
