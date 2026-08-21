import {
  isReservedPageHandle,
  normalizePageHandle,
  type PageItemResponse,
  type PageResponse,
  type SessionResponse,
} from "@grabbin/api";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getPageByHandle, getSession } from "@/lib/server/page-queries";

export type PublicHandleModel = {
  page: PageResponse;
  items: PageItemResponse[];
  visitorsEnabled: boolean;
  isSignedIn: boolean;
  isCurrentUserPage: boolean;
  isPrimaryPage: boolean;
  entitlements: NonNullable<SessionResponse>["entitlements"];
  readOnly: boolean;
  mode: "view" | "edit";
  isDemo: boolean;
};

export const getPublicHandleModel = cache(
  async (rawHandle: string): Promise<PublicHandleModel | null> => {
    const handle = normalizePageHandle(rawHandle);
    if (isReservedPageHandle(handle)) return null;

    const requestHeaders = await headers();
    const sessionRequest = requestHeaders.has("cookie")
      ? getSession()
      : Promise.resolve(null);
    const [pageResult, sessionResult] = await Promise.all([
      getPageByHandle(handle),
      sessionRequest,
    ]);
    if (!pageResult.ok) {
      if (pageResult.response.status === 404) return null;
      throw new Error(
        `Failed to load public page: ${pageResult.response.status}`,
      );
    }

    if (
      sessionResult &&
      !sessionResult.ok &&
      sessionResult.response.status !== 401
    ) {
      throw new Error(
        `Failed to load session: ${sessionResult.response.status}`,
      );
    }

    const session = sessionResult?.ok ? sessionResult.data : null;
    const isSignedIn = Boolean(session?.user);
    const page = pageResult.data.page;
    const isCurrentUserPage = session?.user.id === page.userId;
    const isPrimaryPage = session?.user.primaryPageId === page.id;
    const entitlements = session?.entitlements ?? {
      tier: "free" as const,
      hasAccess: false,
    };
    const readOnly =
      isCurrentUserPage && !entitlements.hasAccess && !isPrimaryPage;

    return {
      page,
      items: pageResult.data.items,
      visitorsEnabled: pageResult.data.visitorsEnabled === true,
      isSignedIn,
      isCurrentUserPage,
      isPrimaryPage,
      entitlements,
      readOnly,
      mode: isCurrentUserPage && !readOnly ? "edit" : "view",
      isDemo: false,
    };
  },
);

export function requirePublicHandleModel(
  model: PublicHandleModel | null,
): PublicHandleModel {
  if (!model) notFound();
  return model;
}
