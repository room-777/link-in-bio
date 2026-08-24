import { env } from "@/lib/env";
import { createPublicImageUrl } from "@/lib/image/public-image-url";

export function getSiteOrigin() {
  return env.NEXT_PUBLIC_APP_URL?.trim() || "https://grabbin.me";
}

export function getPublicImageUrl(image: string | null, updatedAt: string) {
  return createPublicImageUrl(image, updatedAt, env.NEXT_PUBLIC_R2_PUBLIC_URL);
}
