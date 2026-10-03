import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getPageImageUrl } from "@/lib/page-image-url";
import { fetchPage } from "@/lib/server/page-query";
import OwnerPage from "../../components/page/editor/owner-page";
import HandlePage from "../../components/page/public/handle-page";

const getPageForRequest = cache((handle: string, cookie: string) =>
	fetchPage(handle, { cookie }),
);

export async function generateMetadata({
	params,
}: PageProps<"/[handle]">): Promise<Metadata> {
	const { handle } = await params;
	const requestHeaders = await headers();
	const page = await getPageForRequest(
		handle,
		requestHeaders.get("cookie") ?? "",
	);
	if (!page) return {};
	const { page: pageData } = page;
	const displayName = pageData.name?.trim() || `@${pageData.handle}`;
	const bio = pageData.bio?.trim();
	const hasPlaceholderBio = Boolean(bio && /\blorem ipsum\b/i.test(bio));
	const description =
		bio && !hasPlaceholderBio
			? `Explore ${displayName}'s page on Grabbin: ${bio}`.slice(0, 160)
			: `Explore ${displayName}'s links, photos, social profiles, and favorite places on Grabbin.`;
	const title = displayName;
	const icon = getPageImageUrl(pageData.imageSource ?? pageData.imageKey, {
		width: 64,
		height: 64,
		format: "png",
	});
	const appleIcon = getPageImageUrl(pageData.imageSource ?? pageData.imageKey, {
		width: 180,
		height: 180,
		format: "png",
	});

	return {
		title,
		description,
		robots: hasPlaceholderBio ? { index: false, follow: true } : undefined,
		alternates: { canonical: `/${encodeURIComponent(pageData.handle)}` },
		openGraph: {
			title,
			description,
			url: `/${encodeURIComponent(pageData.handle)}`,
			siteName: "Grabbin",
			type: "website",
		},
		twitter: { card: "summary", title, description },
		icons: icon
			? {
					icon: { url: icon, type: "image/png", sizes: "64x64" },
					apple: appleIcon
						? { url: appleIcon, type: "image/png", sizes: "180x180" }
						: undefined,
				}
			: undefined,
	};
}

export default async function Page({ params }: PageProps<"/[handle]">) {
	const { handle } = await params;
	const requestHeaders = await headers();
	const page = await getPageForRequest(
		handle,
		requestHeaders.get("cookie") ?? "",
	);

	if (!page) notFound();

	if (page.page.canEdit) {
		return <OwnerPage pageResponse={page} />;
	}

	return <HandlePage pageResponse={page} />;
}
