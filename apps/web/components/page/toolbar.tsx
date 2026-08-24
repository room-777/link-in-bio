"use client";

import type { PageResponse } from "@grabbin/api";
import {
  ITEM_MEDIA_ACCEPT,
  MAX_ITEM_MEDIA_SIZE,
  normalizeLinkUrl,
} from "@grabbin/api";
import { Smartphone } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { type ChangeEvent, useRef, useState } from "react";
import {
  ChevronLeft,
  Desktop,
  Document2,
  Globe,
  LinkCircle3,
  Loader,
  Send,
  TextCircle,
} from "reicon-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Breakpoint } from "@/lib/handle/page-layout";
import { cn } from "@/lib/utils";
import { ShareDialog } from "./share-dialog";

type ToolbarItemType = "link" | "section" | "text" | "map";

type ToolbarProps = {
  breakpoint?: Breakpoint;
  imageUrl: string | null;
  isSaving?: boolean;
  page: PageResponse;
  onBreakpointChange?: (breakpoint: Breakpoint) => void;
  onItemAdd?: (itemType: ToolbarItemType, url?: string) => void;
  onMediaSelect?: (file: File) => void | Promise<void>;
  readOnly?: boolean;
  siteOrigin: string;
};

function normalizeLinkInput(value: string) {
  try {
    return normalizeLinkUrl(value);
  } catch {
    return null;
  }
}

export default function Toolbar({
  breakpoint = "wide",
  imageUrl,
  isSaving = false,
  page,
  onBreakpointChange,
  onItemAdd,
  onMediaSelect,
  readOnly = false,
  siteOrigin,
}: ToolbarProps) {
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<"toolbar" | "link">("toolbar");
  const [linkUrl, setLinkUrl] = useState("");
  const shouldReduceMotion = useReducedMotion();
  const canAddLink = normalizeLinkInput(linkUrl) !== null;
  const layoutDependency = [view, isSaving].join(":");
  const viewTransition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.2, ease: [0.23, 1, 0.32, 1] as const };

  function submitLink(value: string) {
    if (readOnly || !onItemAdd) return false;
    const normalizedUrl = normalizeLinkInput(value);
    if (!normalizedUrl) return false;
    onItemAdd("link", normalizedUrl);
    setLinkUrl("");
    setView("toolbar");
    return true;
  }

  function handleMediaChange(event: ChangeEvent<HTMLInputElement>) {
    if (readOnly || !onMediaSelect) return;
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_ITEM_MEDIA_SIZE) {
      toast.error("Media files must be 3 MB or smaller.");
      return;
    }
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast.error("Please choose an image or video file.");
      return;
    }
    void onMediaSelect(file);
  }

  return (
    <div
      id="page-toolbar"
      className="pointer-events-none fixed bottom-8 z-[100001] flex w-full items-center justify-center"
    >
      <input
        ref={mediaInputRef}
        type="file"
        accept={ITEM_MEDIA_ACCEPT}
        hidden
        onChange={handleMediaChange}
      />
      <motion.div
        layout
        layoutDependency={layoutDependency}
        transition={{ layout: viewTransition }}
        className="t-toolbar-surface pointer-events-auto flex flex-col overflow-hidden rounded-xl bg-background p-1.5 smooth-shadow-ring shadow-black smooth-ring-neutral-300/30 will-change-transform"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {view === "link" ? (
            <motion.div
              key="link-view"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={viewTransition}
              className="flex items-center gap-1"
            >
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Back to toolbar"
                className="rounded-full text-primary hover:text-primary"
                onClick={() => setView("toolbar")}
              >
                <ChevronLeft className="size-5" />
                {/*<HugeiconsIcon
                  icon={ChevronLeftIcon}
                  strokeWidth={2}
                  className="size-5"
                />*/}
              </Button>
              <InputGroup className="h-9 w-64 rounded-lg bg-transparent has-[[data-slot=input-group-control]:focus-visible]:ring-0">
                <InputGroupInput
                  placeholder="Paste a link"
                  aria-label="Link URL"
                  value={linkUrl}
                  onChange={(event) => setLinkUrl(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      submitLink(linkUrl);
                    }
                  }}
                  onPaste={(event) => {
                    const pasted = event.clipboardData.getData("text");
                    if (submitLink(pasted)) event.preventDefault();
                  }}
                  autoFocus
                  autoComplete="off"
                  disabled={readOnly || !onItemAdd}
                />
                <InputGroupAddon align="inline-end" className="pr-1.5">
                  <InputGroupButton
                    type="button"
                    size="icon-sm"
                    aria-label="Add link"
                    className="bg-brand"
                    disabled={!canAddLink || readOnly || !onItemAdd}
                    onClick={() => submitLink(linkUrl)}
                  >
                    <Send weight="Filled" className="size-4 text-white" />
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </motion.div>
          ) : (
            <motion.div
              key="toolbar-content"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={viewTransition}
              className="flex items-center gap-1"
            >
              <div id="toolbar-content" className="flex items-center gap-1">
                <div className="hidden items-center min-[90rem]:flex">
                  {isSaving ? (
                    <Button
                      variant="brand"
                      size="default"
                      className="w-28 rounded-lg px-8 font-semibold gap-2.5"
                      disabled
                    >
                      <Loader className="size-4 animate-spin" />
                      Saving
                    </Button>
                  ) : (
                    <ShareDialog
                      page={page}
                      imageUrl={imageUrl}
                      siteOrigin={siteOrigin}
                    />
                  )}
                </div>
                <div className="flex items-center gap-0 text-muted-foreground">
                  <ToolbarButton
                    disabled={readOnly || !onItemAdd}
                    label="Link"
                    onClick={() => {
                      setView("link");
                    }}
                  >
                    <LinkCircle3 weight="Outline" className="size-5" />
                  </ToolbarButton>
                  <ToolbarButton
                    disabled={readOnly || !onItemAdd}
                    label="Section Title"
                    onClick={() => onItemAdd?.("section")}
                  >
                    <Document2 weight="Outline" className="size-5" />
                  </ToolbarButton>
                  <ToolbarButton
                    disabled={readOnly || !onItemAdd}
                    label="Text"
                    onClick={() => onItemAdd?.("text")}
                  >
                    <TextCircle weight="Outline" className="size-5" />
                  </ToolbarButton>
                  <ToolbarButton
                    disabled={readOnly || !onMediaSelect}
                    label="Gallery"
                    onClick={() => mediaInputRef.current?.click()}
                    className="overflow-hidden"
                  >
                    <div className="size-6 surface-line before:rounded-md after:rounded-md">
                      <Image
                        src={"https://cdn.grabbin.me/assets/features/6.png"}
                        alt=""
                        width={300}
                        height={300}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                    {/*<GalleryCircle weight="Outline" className="size-5" />*/}
                  </ToolbarButton>
                  <ToolbarButton
                    disabled={readOnly || !onItemAdd}
                    label="Map"
                    onClick={() => onItemAdd?.("map")}
                  >
                    <Globe weight="Outline" className="size-5" />
                  </ToolbarButton>
                </div>
                <ToolbarSeparator />
                <aside className="hidden space-x-0 text-muted-foreground min-[90rem]:flex">
                  <ToolbarButton
                    label="Wide"
                    disabled={!onBreakpointChange}
                    onClick={() => onBreakpointChange?.("wide")}
                    className={cn(
                      breakpoint === "wide" &&
                        "bg-foreground text-background hover:bg-foreground hover:text-background focus:bg-foreground focus:text-background",
                    )}
                  >
                    <Desktop className={"size-5"} />
                    {/*<Laptop4 />*/}
                    {/*<HugeiconsIcon
                      icon={Computer}
                      strokeWidth={2}
                      className="size-5"
                    />*/}
                  </ToolbarButton>
                  <ToolbarButton
                    label="Compact"
                    disabled={!onBreakpointChange}
                    onClick={() => onBreakpointChange?.("compact")}
                    className={cn(
                      breakpoint === "compact" &&
                        "bg-foreground text-background hover:bg-foreground hover:text-background focus:bg-foreground focus:text-background",
                    )}
                  >
                    <HugeiconsIcon
                      icon={Smartphone}
                      strokeWidth={2}
                      className="size-5"
                    />
                  </ToolbarButton>
                </aside>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function ToolbarButton({
  label,
  children,
  className,
  onClick,
  disabled = false,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className={cn(
              "rounded-lg text-primary hover:text-primary",
              className,
            )}
            aria-label={label}
            onClick={onClick}
            disabled={disabled}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent sideOffset={12}>{label}</TooltipContent>
    </Tooltip>
  );
}

function ToolbarSeparator() {
  return (
    <div
      aria-hidden="true"
      className="my-3 hidden w-0.5 self-stretch rounded-2xl bg-muted-foreground/20 min-[90rem]:flex"
    />
  );
}
