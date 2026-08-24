"use client";

import { useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { PublicControls } from "@/components/handle/public-controls";
import { PublicHandleShell } from "@/components/handle/public-handle-shell";
import { PublicProfile } from "@/components/handle/public-profile";
import { useBreakpointTransition } from "@/hooks/use-breakpoint-transition";
import type { Breakpoint } from "@/lib/handle/page-layout";
import type { PublicHandleModel } from "@/lib/server/public-handle-model";

const BrowserGrid = dynamic(
  () =>
    import("@/components/handle/public-handle-grid-client").then(
      ({ PublicHandleGridClient }) => PublicHandleGridClient,
    ),
  { ssr: false },
);

type PublicHandlePageClientProps = {
  apiBaseUrl: string;
  imageUrl: string | null;
  imageBaseUrl: string | null;
  mapboxAccessToken?: string;
  model: PublicHandleModel;
  siteOrigin: string;
};

export function PublicHandlePageClient({
  apiBaseUrl,
  imageUrl,
  imageBaseUrl,
  mapboxAccessToken,
  model,
  siteOrigin,
}: PublicHandlePageClientProps) {
  const [page, setPage] = useState(model.page);
  const currentModel = page === model.page ? model : { ...model, page };
  const [previewBreakpoint, setPreviewBreakpoint] =
    useState<Breakpoint>("wide");
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const { breakpointTransition, changeBreakpoint } = useBreakpointTransition({
    previewBreakpoint,
    setPreviewBreakpoint,
    shouldReduceMotion,
  });

  return (
    <PublicHandleShell
      breakpoint={previewBreakpoint}
      breakpointTransition={breakpointTransition}
      profile={
        <PublicProfile
          model={currentModel}
          breakpoint={previewBreakpoint}
          imageBaseUrl={imageBaseUrl}
          onSavingChange={setIsProfileSaving}
        />
      }
      grid={
        <BrowserGrid
          imageUrl={imageUrl}
          isProfileSaving={isProfileSaving}
          mapboxAccessToken={mapboxAccessToken}
          model={currentModel}
          onBreakpointChange={changeBreakpoint}
          siteOrigin={siteOrigin}
        />
      }
      controls={
        model.isDemo ? null : (
          <PublicControls
            model={currentModel}
            apiBaseUrl={apiBaseUrl}
            imageBaseUrl={imageBaseUrl}
            siteOrigin={siteOrigin}
            onPageChange={setPage}
          />
        )
      }
      toolbar={null}
    />
  );
}
