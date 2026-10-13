"use client";

import { useSuspensePageByHandleQuery } from "@/query/page/by-handle";
import HandlePage from "./public/handle-page";

export function PublicPageQueryView({ handle }: { handle: string }) {
	const pageResponse = useSuspensePageByHandleQuery(handle);
	return <HandlePage pageResponse={pageResponse} />;
}
