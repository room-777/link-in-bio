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

export const ENTRY_ROUTE_HEADER = "X-Entry-Route";

let rememberedEntryRoute: EntryRoute | undefined;

const isProductionHost = () =>
  typeof window !== "undefined" && window.location.hostname === "grabbin.me";

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

export function rememberEntryRoute(pathname: string): EntryRoute {
  if (rememberedEntryRoute) return rememberedEntryRoute;
  const route = getEntryRoute(pathname);
  rememberedEntryRoute = route;
  return route;
}

export function getEntryRouteHeader(): EntryRoute {
  if (rememberedEntryRoute) return rememberedEntryRoute;
  if (typeof window === "undefined") return "other";
  return getEntryRoute(window.location.pathname);
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
