"use client";

import type { PageResponse } from "@grabbin/api";
import Toolbar from "@/components/page/toolbar";
import type { Breakpoint } from "@/lib/handle/page-layout";

export function GridToolbar({
  breakpoint,
  imageUrl,
  isSaving,
  onMediaSelect,
  onItemAdd,
  onBreakpointChange,
  page,
  siteOrigin,
}: {
  breakpoint: Breakpoint;
  imageUrl: string | null;
  isSaving: boolean;
  onMediaSelect: (file: File) => void | Promise<void>;
  onItemAdd: (
    itemType: "link" | "map" | "section" | "text",
    url?: string,
  ) => void;
  onBreakpointChange: (breakpoint: Breakpoint) => void;
  page: PageResponse;
  siteOrigin: string;
}) {
  return (
    <Toolbar
      breakpoint={breakpoint}
      imageUrl={imageUrl}
      isSaving={isSaving}
      page={page}
      siteOrigin={siteOrigin}
      onBreakpointChange={onBreakpointChange}
      onItemAdd={onItemAdd}
      onMediaSelect={onMediaSelect}
    />
  );
}
