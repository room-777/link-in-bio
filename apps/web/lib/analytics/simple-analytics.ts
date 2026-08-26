export type EntryRoute =
  | "home"
  | "pricing"
  | "blog"
  | "demo"
  | "login"
  | "new"
  | "public_handle"
  | "other";

export type SimpleAnalyticsEventName =
  | "signup_completed"
  | "first_page_created";

declare global {
  interface Window {
    sa_event?: (
      name: SimpleAnalyticsEventName,
      metadata: { entry_route: EntryRoute },
    ) => void;
    sa_pageview?: (path?: string) => void;
  }
}

const ENTRY_ROUTE_COOKIE = "grabbin_entry_route";

const entryRoutes = new Set<EntryRoute>([
  "home",
  "pricing",
  "blog",
  "demo",
  "login",
  "new",
  "public_handle",
  "other",
]);

const isProductionHost = () =>
  typeof window !== "undefined" && window.location.hostname === "grabbin.me";

const isEntryRoute = (value: string): value is EntryRoute =>
  entryRoutes.has(value as EntryRoute);

export function getEntryRoute(pathname: string): EntryRoute {
  if (pathname === "/") return "home";
  if (pathname === "/pricing") return "pricing";
  if (pathname === "/blog" || pathname.startsWith("/blog/")) return "blog";
  if (pathname === "/demo") return "demo";
  if (pathname === "/log-in") return "login";
  if (pathname === "/new") return "new";
  if (/^\/[^/]+\/?$/.test(pathname)) return "public_handle";
  return "other";
}

const getCookieValue = (name: string) => {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  if (!cookie) return null;
  try {
    return decodeURIComponent(cookie.slice(prefix.length));
  } catch {
    return "";
  }
};

export function rememberEntryRoute(pathname: string): EntryRoute {
  const existingValue = getCookieValue(ENTRY_ROUTE_COOKIE);
  if (existingValue !== null)
    return isEntryRoute(existingValue) ? existingValue : "other";

  const route = getEntryRoute(pathname);
  if (typeof document !== "undefined") {
    const attributes = [
      `${ENTRY_ROUTE_COOKIE}=${encodeURIComponent(route)}`,
      "Path=/",
      "SameSite=Lax",
    ];
    if (isProductionHost()) {
      attributes.push("Domain=.grabbin.me");
      if (window.location.protocol === "https:") attributes.push("Secure");
    }
    // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API is not available in all supported browsers.
    document.cookie = attributes.join("; ");
  }
  return route;
}

export function trackSimpleAnalyticsPageview(path?: string) {
  if (!isProductionHost()) return;
  window.sa_pageview?.(path);
}

export function trackSimpleAnalyticsEvent(
  name: SimpleAnalyticsEventName,
  metadata: { entry_route: EntryRoute },
) {
  if (!isProductionHost()) return;
  window.sa_event?.(name, metadata);
}
