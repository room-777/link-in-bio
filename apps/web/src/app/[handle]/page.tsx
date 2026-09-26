import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";

import HandlePage from "@/components/page/handle-page";
import OwnerPage from "@/components/page/owner-page";
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

	return {
		title: pageData.name ?? pageData.handle,
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
