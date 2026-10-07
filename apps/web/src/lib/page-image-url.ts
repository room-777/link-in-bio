import { env } from "@grabbin/env/web";

type PageImageOptions = {
	width: number;
	height: number;
	format?: "auto" | "png";
	fit?: "cover" | "scale-down";
};

export function getPageImageUrl(
	key: string | null,
	options: PageImageOptions = { width: 512, height: 512, format: "auto" },
) {
	if (!key) return null;
	if (/^https?:\/\//.test(key)) return key;

	const publicUrl = env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, "");
	if (!publicUrl) return null;
	const isLocalR2 = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(
		publicUrl,
	);

	const source = `${publicUrl}${isLocalR2 ? "/media" : ""}/${key
		.split("/")
		.map((part) => encodeURIComponent(part))
		.join("/")}`;
	const pageDomain = env.NEXT_PUBLIC_PAGE_DOMAIN;
	if (
		isLocalR2 ||
		!pageDomain ||
		/^(localhost|127\.0\.0\.1)/.test(pageDomain)
	) {
		return source;
	}

	const transform = [
		`width=${options.width}`,
		`height=${options.height}`,
		`fit=${options.fit ?? "cover"}`,
		`format=${options.format ?? "auto"}`,
	].join(",");
	return `https://${pageDomain}/cdn-cgi/image/${transform}/${source}`;
}
