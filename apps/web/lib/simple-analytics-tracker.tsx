"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    sa_pageview?: (path?: string) => void;
  }
}

const isProductionHost = () =>
  typeof window !== "undefined" && window.location.hostname === "grabbin.me";

const pageAnalyticsPath = (pageId: string) =>
  `/__analytics/pages/${encodeURIComponent(pageId)}`;

export function SimpleAnalyticsTracker({ pageId }: { pageId?: string } = {}) {
  const pathname = usePathname();
  const trackedPageIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isProductionHost()) return;
    if (pageId) {
      if (trackedPageIdRef.current === pageId) return;
      trackedPageIdRef.current = pageId;
    }

    const path = pageId ? pageAnalyticsPath(pageId) : pathname;

    if (window.sa_pageview) {
      window.sa_pageview(path);
      return;
    }

    const retryOnLoad = () => window.sa_pageview?.(path);
    window.addEventListener("load", retryOnLoad, { once: true });
    return () => window.removeEventListener("load", retryOnLoad);
  }, [pageId, pathname]);

  return null;
}
