"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { getPageQueryOptions } from "@/lib/page-query";
import OwnerPage from "./editor/owner-page";
import HandlePage from "./public/handle-page";

export function OwnerPageQueryView({ handle }: { handle: string }) {
	const { data } = useSuspenseQuery(getPageQueryOptions(handle));
	if (!data) throw new Error("Page data is unavailable.");
	return <OwnerPage pageResponse={data} />;
}

export function PublicPageQueryView({ handle }: { handle: string }) {
	const { data } = useSuspenseQuery(getPageQueryOptions(handle));
	if (!data) throw new Error("Page data is unavailable.");
	return <HandlePage pageResponse={data} />;
}
