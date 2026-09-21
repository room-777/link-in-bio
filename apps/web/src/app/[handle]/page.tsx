import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";

import HandlePage from "@/components/page/handle-page";
import OwnerPage from "@/components/page/owner-page";
import { getPageImageUrl } from "@/lib/page-image-url";
import { fetchPage } from "@/lib/server/page-query";

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

	const icon = getPageImageUrl(pageData.imageKey, {
		width: 64,
		height: 64,
		format: "png",
	});
	const appleIcon = getPageImageUrl(pageData.imageKey, {
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
