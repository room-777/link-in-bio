import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NewPage } from "@/components/page/new-page";
import JsonLd from "@/components/seo/json-ld";
import { env } from "@/lib/env";
import { createWebPageJsonLd } from "@/lib/seo/json-ld";
import { createMetadata } from "@/lib/seo/metadata";
import { getOwnedPages } from "@/lib/server/page-queries";

const NEW_PAGE_DESCRIPTION = "Create your page.";

export const metadata: Metadata = createMetadata({
  title: "Create your page",
  description: NEW_PAGE_DESCRIPTION,
  canonicalPath: "/new",
  noIndex: true,
});

const newPageJsonLd = createWebPageJsonLd({
  title: "New page",
  description: NEW_PAGE_DESCRIPTION,
  path: "/new",
});

export default async function NewPageRoute() {
  const ownedPages = await getOwnedPages();
  if (!ownedPages.ok) {
    if (ownedPages.response.status === 401) {
      redirect("/log-in?redirect=/new");
    }
    throw new Error(
      `Owned pages request failed with status ${ownedPages.response.status}.`,
    );
  }

  if (!ownedPages.data.canCreatePage) redirect("/");

  return (
    <>
      <JsonLd nodes={[newPageJsonLd]} />
      <NewPage appDomain={env.NEXT_PUBLIC_APP_DOMAIN} />
    </>
  );
}
