"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { uploadPageItemMedia } from "@/lib/client/item-media-api";
import { useGridEditorStore } from "@/lib/grid/editor-store";
import type { Breakpoint } from "@/lib/handle/page-layout";
import type { PublicHandleModel } from "@/lib/server/public-handle-model";

const GridSection = dynamic(
  () =>
    import("@/components/handle/grid/grid-section").then(
      ({ GridSection }) => GridSection,
    ),
  { ssr: false },
);
const GridToolbar = dynamic(
  () =>
    import("@/components/handle/grid/grid-toolbar").then(
      ({ GridToolbar }) => GridToolbar,
    ),
  { ssr: false },
);

type PublicHandleGridClientProps = {
  imageUrl: string | null;
  isProfileSaving: boolean;
  mapboxAccessToken?: string;
  model: PublicHandleModel;
  onBreakpointChange: (breakpoint: Breakpoint) => void;
  siteOrigin: string;
};

export function PublicHandleGridClient({
  imageUrl,
  isProfileSaving,
  mapboxAccessToken,
  model,
  onBreakpointChange,
  siteOrigin,
}: PublicHandleGridClientProps) {
  const [previewBreakpoint, setPreviewBreakpoint] =
    useState<Breakpoint>("wide");
  const [isMounted, setIsMounted] = useState(false);
  const grid = useGridEditorStore({
    initialItems: model.items,
    handle: model.page.handle,
    breakpoint: previewBreakpoint,
    enabled: model.mode === "edit",
    persistItems: !model.isDemo,
  });

  useEffect(() => setIsMounted(true), []);

  return (
    <>
      <GridSection
        items={grid.items}
        mode={model.mode}
        breakpoint={previewBreakpoint}
        mapboxAccessToken={mapboxAccessToken}
        autoFocusItemId={grid.autoFocusItemId}
        onAutoFocus={grid.clearAutoFocusItem}
        onCommand={grid.dispatchCommand}
      />
      {isMounted && model.mode === "edit"
        ? createPortal(
            <GridToolbar
              breakpoint={previewBreakpoint}
              imageUrl={imageUrl}
              isSaving={isProfileSaving || grid.status === "saving"}
              page={model.page}
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
                if (model.isDemo) return;
                try {
                  const uploaded = await uploadPageItemMedia(
                    model.page.handle,
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
              onBreakpointChange={(breakpoint) => {
                setPreviewBreakpoint(breakpoint);
                onBreakpointChange(breakpoint);
              }}
            />,
            document.body,
          )
        : null}
    </>
  );
}
