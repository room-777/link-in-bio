import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogInForm } from "@/components/auth/log-in-form";
import JsonLd from "@/components/seo/json-ld";
import { env } from "@/lib/env";
import { createWebPageJsonLd } from "@/lib/seo/json-ld";
import { createMetadata } from "@/lib/seo/metadata";
import { getMyPage, getSession } from "@/lib/server/page-queries";

const LOG_IN_DESCRIPTION = "Log in to your account";

export const metadata: Metadata = createMetadata({
  title: "Log in",
  description: LOG_IN_DESCRIPTION,
  canonicalPath: "/log-in",
});

const logInJsonLd = createWebPageJsonLd({
  title: "Log in",
  description: LOG_IN_DESCRIPTION,
  path: "/log-in",
});

function getSafeRedirect(value: unknown) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/";
  }
  return value;
}

async function getAuthenticatedRedirect() {
  const session = await getSession();
  if (!session.ok) {
    if (session.response.status === 401) return null;
    throw new Error(
      `Session request failed with status ${session.response.status}.`,
    );
  }
  if (!session.data) return null;

  const myPage = await getMyPage();
  if (!myPage.ok) {
    throw new Error(
      `My page request failed with status ${myPage.response.status}.`,
    );
  }

  return myPage.data.page?.handle ? `/${myPage.data.page.handle}` : "/new";
}

export default async function LogInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string | string[] }>;
}) {
  const authenticatedRedirect = await getAuthenticatedRedirect();
  if (authenticatedRedirect) redirect(authenticatedRedirect as never);

  const search = await searchParams;
  const redirectTo = Array.isArray(search.redirect)
    ? search.redirect[0]
    : search.redirect;

  return (
    <>
      <JsonLd nodes={[logInJsonLd]} />
      <LogInForm
        apiBaseUrl={env.NEXT_PUBLIC_API_BASE_URL}
        redirectTo={getSafeRedirect(redirectTo)}
      />
    </>
  );
}
