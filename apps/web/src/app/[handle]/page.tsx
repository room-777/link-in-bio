import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { DEMO_PAGE_RESPONSE } from "@/lib/demo-page";
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
	if (handle === "demo") {
		const image = getPageImageUrl(DEMO_PAGE_RESPONSE.page.imageSource, {
			width: 64,
			height: 64,
			format: "png",
		});
		return {
			title: DEMO_PAGE_RESPONSE.page.name ?? "demo",
			icons: image ? { icon: image } : undefined,
		};
	}
	const requestHeaders = await headers();
	const page = await getPageForRequest(
		handle,
		requestHeaders.get("cookie") ?? "",
	);
	if (!page) return {};
	const { page: pageData } = page;
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
		title: pageData.name ?? pageData.handle,
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
	if (handle === "demo") {
		return <OwnerPage pageResponse={DEMO_PAGE_RESPONSE} demoMode />;
	}
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
