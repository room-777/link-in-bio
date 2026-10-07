import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import { getCustomDomainHostname } from "@/lib/custom-domain-host";
import { getPageImageUrl } from "@/lib/page-image-url";
import { getPageQueryOptions } from "@/lib/page-query";
import { makeQueryClient } from "@/lib/query-client";
import { fetchPage } from "@/lib/server/page-query";
import {
	OwnerPageQueryView,
	PublicPageQueryView,
} from "../../components/page/page-query-view";

const getPageForRequest = cache((handle: string, cookie: string) =>
	fetchPage(handle, { cookie }),
);

export async function generateMetadata({
	params,
}: PageProps<"/[handle]">): Promise<Metadata> {
	const { handle } = await params;
	const requestHeaders = await headers();
	if (getCustomDomainHostname(requestHeaders.get("host"))) return {};
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
	if (getCustomDomainHostname(requestHeaders.get("host"))) notFound();
	const queryClient = makeQueryClient();
	const pageQueryOptions = getPageQueryOptions(handle);
	const cookie = requestHeaders.get("cookie") ?? "";
	const page = await queryClient.query({
		...pageQueryOptions,
		queryFn: () => getPageForRequest(handle, cookie),
	});

	if (!page) notFound();

	const canEdit = page.page.canEdit;
	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<Suspense fallback={null}>
				{canEdit ? (
					<OwnerPageQueryView handle={handle} />
				) : (
					<PublicPageQueryView handle={handle} />
				)}
			</Suspense>
		</HydrationBoundary>
	);
}
