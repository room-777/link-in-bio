"use client";

import { useReducedMotion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { GridSection } from "@/components/handle/grid/grid-section";
import { GridToolbar } from "@/components/handle/grid/grid-toolbar";
import { PublicControls } from "@/components/handle/public-controls";
import { PublicHandleShell } from "@/components/handle/public-handle-shell";
import { PublicProfile } from "@/components/handle/public-profile";
import { useBreakpointTransition } from "@/hooks/use-breakpoint-transition";
import { uploadPageItemMedia } from "@/lib/client/item-media-api";
import { useGridEditorStore } from "@/lib/grid/editor-store";
import type { Breakpoint } from "@/lib/handle/page-layout";
import type { PublicHandleModel } from "@/lib/server/public-handle-model";

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
  const grid = useGridEditorStore({
    initialItems: currentModel.items,
    handle: currentModel.page.handle,
    breakpoint: previewBreakpoint,
    enabled: currentModel.mode === "edit",
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
        <GridSection
          items={grid.items}
          mode={currentModel.mode}
          breakpoint={previewBreakpoint}
          mapboxAccessToken={mapboxAccessToken}
          autoFocusItemId={grid.autoFocusItemId}
          onAutoFocus={grid.clearAutoFocusItem}
          onCommand={grid.dispatchCommand}
        />
      }
      controls={
        <PublicControls
          model={currentModel}
          apiBaseUrl={apiBaseUrl}
          imageBaseUrl={imageBaseUrl}
          siteOrigin={siteOrigin}
          onPageChange={setPage}
        />
      }
      toolbar={
        currentModel.mode === "edit" ? (
          <GridToolbar
            breakpoint={previewBreakpoint}
            imageUrl={imageUrl}
            isSaving={isProfileSaving || grid.status === "saving"}
            page={currentModel.page}
            siteOrigin={siteOrigin}
            onMediaSelect={async (file) => {
              const previewUrl = URL.createObjectURL(file);
              const itemId = grid.addPendingMedia({
                mimeType: file.type,
                previewUrl,
              });
              if (!itemId) {
                URL.revokeObjectURL(previewUrl);
                return;
              }
              try {
                const uploaded = await uploadPageItemMedia(
                  currentModel.page.handle,
                  file,
                );
                grid.updateMediaUpload({
                  itemId,
                  objectKey: uploaded.objectKey,
                  mimeType: uploaded.mimeType,
                });
              } catch (error) {
                grid.removeMediaItem(itemId);
                URL.revokeObjectURL(previewUrl);
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Media upload failed.",
                );
              }
            }}
            onItemAdd={(itemType, url) =>
              grid.dispatchCommand({ type: "add-item", itemType, url })
            }
            onBreakpointChange={changeBreakpoint}
          />
        ) : null
      }
    />
  );
}
