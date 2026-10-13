"use client";

import { useSuspensePageByHandleQuery } from "../queries/by-handle";
import HandlePage from "./handle-page";

export default function PublicPageQueryView({ handle }: { handle: string }) {
	const pageResponse = useSuspensePageByHandleQuery(handle);
	return <HandlePage pageResponse={pageResponse} />;
}

export { PublicPageQueryView };
