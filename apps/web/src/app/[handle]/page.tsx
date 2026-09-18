import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";

import HandlePage from "@/components/page/handle-page";
import PageProfileForm from "@/components/page/page-profile-form";
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

	const icon = getPageImageUrl(page.image, {
		width: 64,
		height: 64,
		format: "png",
	});
	const appleIcon = getPageImageUrl(page.image, {
		width: 180,
		height: 180,
		format: "png",
	});
	return {
		title: page.name ?? page.handle,
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

	if (page.canEdit) {
		return (
			<main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-start gap-8 p-6 px-12 pt-12 min-[90rem]:mx-0 min-[90rem]:min-h-dvh min-[90rem]:max-w-2xl min-[90rem]:pt-16">
				<PageProfileForm
					page={page}
					mode={page.onboarding ? "edit" : "onboarding"}
				/>
			</main>
		);
	}

	return <HandlePage page={page} />;
}
