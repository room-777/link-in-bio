import type { Metadata } from "next";
import { getLegalDocument } from "@/lib/content";
import { createMetadata } from "@/lib/seo/metadata";

const document = getLegalDocument("terms");

export const metadata: Metadata = createMetadata({
  title: document.title,
  description: document.description,
  canonicalPath: "/terms",
});

export default function TermsPage() {
  const Document = document.Component;

  return (
    <main className="legal-document flex flex-col items-center px-5 pt-40 pb-24">
      <article className="w-full max-w-xl px-5">
        <header className="flex flex-col items-center text-center">
          <h1 className="text-4xl leading-10 font-medium tracking-[-0.04em] text-foreground">
            {document.title}
          </h1>
          <p className="mt-4 max-w-sm text-center text-sm leading-5 text-muted-foreground">
            {document.description}
          </p>
          <time className="mt-4 inline-flex h-7 items-center rounded-md bg-muted px-2.5 text-sm leading-5 text-muted-foreground">
            Last updated {document.lastUpdated}
          </time>
        </header>
        <div className="legal-markdown mt-16">
          <Document />
        </div>
      </article>
    </main>
  );
}
