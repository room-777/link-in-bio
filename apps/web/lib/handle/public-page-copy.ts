import type { PageResponse } from "@grabbin/api";

export function getPublicPageTitle(page: PageResponse) {
  return page.name?.trim() || `@${page.handle}`;
}

export function getPublicPageDescription(page: PageResponse) {
  return (
    page.bio?.trim() ||
    `${getPublicPageTitle(page)} on Grabbin: links, media, and more.`
  );
}
