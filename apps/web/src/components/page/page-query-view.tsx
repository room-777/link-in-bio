"use client";

import { useSuspensePageByHandleQuery } from "@/query/page/by-handle";
import OwnerPage from "./editor/owner-page";
import HandlePage from "./public/handle-page";

export function OwnerPageQueryView({ handle }: { handle: string }) {
	const pageResponse = useSuspensePageByHandleQuery(handle);
	return <OwnerPage pageResponse={pageResponse} />;
}

export function PublicPageQueryView({ handle }: { handle: string }) {
	const pageResponse = useSuspensePageByHandleQuery(handle);
	return <HandlePage pageResponse={pageResponse} />;
}
