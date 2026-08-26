"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  rememberEntryRoute,
  trackSimpleAnalyticsPageview,
} from "./analytics/simple-analytics";

const pageAnalyticsPath = (pageId: string) =>
  `/__analytics/pages/${encodeURIComponent(pageId)}`;

export function SimpleAnalyticsTracker({ pageId }: { pageId?: string } = {}) {
  const pathname = usePathname();
  const trackedPageIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (pageId) {
      if (trackedPageIdRef.current === pageId) return;
      trackedPageIdRef.current = pageId;
    } else {
      rememberEntryRoute(pathname);
    }

    const path = pageId ? pageAnalyticsPath(pageId) : pathname;

    if (typeof window !== "undefined" && window.sa_pageview) {
      trackSimpleAnalyticsPageview(path);
      return;
    }

    const retryOnLoad = () => trackSimpleAnalyticsPageview(path);
    window.addEventListener("load", retryOnLoad, { once: true });
    return () => window.removeEventListener("load", retryOnLoad);
  }, [pageId, pathname]);

  return null;
}
