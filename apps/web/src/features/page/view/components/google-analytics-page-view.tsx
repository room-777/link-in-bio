"use client";

import { useEffect } from "react";
import {
	isCustomDomainHost,
	sendGoogleAnalyticsPageView,
	setGoogleAnalyticsPageContext,
} from "@/lib/google-analytics";

/**
 * 핸들 페이지의 page_view를 보낸다. page_id 등을 먼저 넣고 보내므로
 * 사이트 안에서 이동해도 다른 페이지 값이 섞이지 않는다.
 */
export default function GoogleAnalyticsPageView({
	pageId,
	isOwner,
}: {
	pageId: string;
	isOwner: boolean;
}) {
	useEffect(() => {
		setGoogleAnalyticsPageContext({
			page_id: pageId,
			domain_type: isCustomDomainHost(window.location.hostname)
				? "custom"
				: "grabbin",
			is_owner: isOwner,
		});
		// 제목이 바뀐 뒤에 보내도록 한 프레임 미룬다.
		const frame = requestAnimationFrame(() =>
			sendGoogleAnalyticsPageView("handle"),
		);
		return () => {
			cancelAnimationFrame(frame);
			setGoogleAnalyticsPageContext(null);
		};
	}, [pageId, isOwner]);

	return null;
}
