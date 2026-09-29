import { env } from "@grabbin/env/web";

type PageMediaKind = "image" | "video";

export function getPageMediaUrl(source: string, kind: PageMediaKind) {
	if (source.startsWith("data:") || source.startsWith("blob:")) return source;

	const pageDomain = env.NEXT_PUBLIC_PAGE_DOMAIN?.replace(/\/$/, "");
	const publicUrl = env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, "");
	if (
		!pageDomain ||
		(kind === "video" && !publicUrl) ||
		/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(pageDomain)
	) {
		return source;
	}

	try {
		const sourceUrl = new URL(source);
		if (sourceUrl.protocol !== "https:") return source;
		if (
			kind === "video" &&
			(!publicUrl || sourceUrl.origin !== new URL(publicUrl).origin)
		) {
			return source;
		}
	} catch {
		return source;
	}

	const options =
		kind === "video"
			? "mode=video,width=1600,audio=false"
			: "width=1600,fit=scale-down,quality=70,format=auto";
	const service = kind === "video" ? "media" : "image";
	return `https://${pageDomain}/cdn-cgi/${service}/${options}/${source}`;
}

export function getPageImagePlaceholderUrl(source: string) {
	const pageDomain = env.NEXT_PUBLIC_PAGE_DOMAIN?.replace(/\/$/, "");
	if (!pageDomain || /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(pageDomain)) {
		return undefined;
	}

	try {
		if (new URL(source).protocol !== "https:") return undefined;
	} catch {
		return undefined;
	}

	return `https://${pageDomain}/cdn-cgi/image/width=32,fit=scale-down,quality=20,blur=12,format=auto/${source}`;
}
