import {
  ChevronLeftIcon,
  CropIcon,
  LinkIcon,
  LocateFixedIcon,
  MinusIcon,
  MoveIcon,
  PlusIcon,
  TrashIcon,
  UnlinkIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Fragment, useEffect, useState } from "react";
import {
  useMapItemInteraction,
  useOptionalMapItemInteraction,
} from "@/components/handle/grid/map/map-item-interaction-context";
import { useOptionalMediaCropInteraction } from "@/components/handle/grid/media-crop-interaction-context";
import { PresetIcon } from "@/components/handle/grid/preset-icon";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import type {
  GridItemCommandHandler,
  ItemControlsProps,
} from "@/lib/grid/item-registry";
import { cn } from "@/lib/utils";

type ItemDeleteButtonProps = {
  itemId: string;
  onCommand: GridItemCommandHandler;
};

export function ItemDeleteButton({ itemId, onCommand }: ItemDeleteButtonProps) {
  return (
    <Button
      type="button"
      variant="default"
      size="icon-sm"
      aria-label="Delete"
      title="Delete"
      data-grid-item-delete-control="true"
      onClick={() => onCommand({ type: "delete-item", itemId })}
      style={{ backgroundColor: "var(--primary)" }}
      className="cursor-pointer! absolute -top-4 -right-4 z-20 inline-flex size-10 p-1 items-center justify-center rounded-lg opacity-0 shadow-xs transition-[opacity,transform,scale,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:scale-100 focus-visible:opacity-100 group-hover/grid-item:scale-100 group-hover/grid-item:opacity-100 motion-reduce:transition-none"
    >
      <div className="flex size-full items-center justify-center rounded-sm hover:bg-white/20">
        <TrashIcon className="size-5 stroke-[2.5px]" />
      </div>
    </Button>
  );
}

function MapItemExtraControls() {
  const { isLocationEditing, setLocationEditing, zoomIn, zoomOut, locate } =
    useMapItemInteraction();

  return (
    <Popover
      open={isLocationEditing}
      onOpenChange={(open, details) => {
        if (
          !open &&
          details.reason === "outside-press" &&
          details.event.target instanceof Element &&
          details.event.target.closest('[data-grid-item-type="map"]')
        ) {
          details.cancel();
          return;
        }

        setLocationEditing(open);
      }}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={
              isLocationEditing ? "Stop editing location" : "Edit location"
            }
            aria-pressed={isLocationEditing}
            aria-expanded={isLocationEditing}
            className={cn(
              "cursor-pointer! rounded-md text-white hover:bg-white/20 hover:text-white",
              isLocationEditing &&
                "bg-brand! text-white! hover:bg-brand! hover:text-white!",
            )}
          >
            <MoveIcon />
          </Button>
        }
      />
      <PopoverContent
        side="bottom"
        sideOffset={8}
        data-grid-item-drag-cancel="true"
        className="h-10 w-auto flex-row gap-0.5 rounded-lg bg-black p-1 shadow-lg"
      >
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Zoom out"
          title="Zoom out"
          onClick={zoomOut}
          className="cursor-pointer! rounded-md text-white hover:bg-white/20 hover:text-white"
        >
          <MinusIcon className="size-5" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Zoom in"
          title="Zoom in"
          onClick={zoomIn}
          className="cursor-pointer! rounded-md text-white hover:bg-white/20 hover:text-white"
        >
          <PlusIcon className="size-5" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Go to current location"
          title="Go to current location"
          onClick={locate}
          className="cursor-pointer! rounded-md text-white hover:bg-white/20 hover:text-white"
        >
          <LocateFixedIcon className="size-5" />
        </Button>
      </PopoverContent>
    </Popover>
  );
}

export function ItemControls({
  item,
  capabilities,
  onCommand,
}: ItemControlsProps) {
  const [view, setView] = useState<"toolbar" | "link">("toolbar");
  const [linkUrl, setLinkUrl] = useState("");
  const shouldReduceMotion = useReducedMotion();
  const mapInteraction = useOptionalMapItemInteraction();
  const mediaCropInteraction = useOptionalMediaCropInteraction();
  const isMapItem = item.type === "map" && mapInteraction !== null;
  const menuControls = capabilities.controls.filter(
    (control) => control.command !== "delete-item",
  );
  const linkItem = item.type === "text" || item.type === "media" ? item : null;
  const hasPresetControls = menuControls.some(
    (control) => control.command === "apply-preset",
  );
  const firstAdditionalControlIndex = menuControls.findIndex(
    (control) => control.command !== "apply-preset",
  );
  const hasSeparator =
    isMapItem || (hasPresetControls && firstAdditionalControlIndex >= 0);
  const controlsWidth =
    (menuControls.length + (isMapItem ? 1 : 0)) * 32 +
    8 +
    (hasSeparator ? 10 : 0);
  const viewTransition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.2, ease: [0.23, 1, 0.32, 1] as const };

  useEffect(() => {
    if (view === "link") setLinkUrl(linkItem?.data.link ?? "");
  }, [linkItem, view]);

  function closeLinkView() {
    setLinkUrl("");
    setView("toolbar");
  }

  function updateLink(value: string) {
    if (!linkItem) return;
    onCommand?.({
      type: "update-data",
      itemId: linkItem.id,
      data: { ...linkItem.data, link: value || undefined },
    });
  }

  if (menuControls.length === 0 && !isMapItem) {
    return null;
  }

  return (
    <motion.div
      layout
      transition={{ layout: viewTransition }}
      style={{ width: controlsWidth }}
      className="flex h-10 flex-nowrap items-center gap-0.5 overflow-hidden rounded-lg bg-black p-1 shadow-lg"
    >
      <AnimatePresence initial={false} mode="popLayout">
        {view === "link" && linkItem ? (
          <motion.div
            key="link-view"
            initial={{ opacity: 0, transform: "translateX(8px)" }}
            animate={{ opacity: 1, transform: "translateX(0px)" }}
            exit={{ opacity: 0, transform: "translateX(-8px)" }}
            transition={viewTransition}
            className="flex w-full min-w-0 items-center gap-0"
          >
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Back to controls"
              className="cursor-pointer! rounded-md text-white hover:bg-muted-foreground/40 hover:text-background/90"
              onClick={closeLinkView}
            >
              <ChevronLeftIcon className="size-5" />
            </Button>
            <InputGroup className="h-8 min-w-0 flex-1 rounded-full bg-transparent text-white has-[[data-slot=input-group-control]:focus-visible]:ring-0">
              <InputGroupInput
                placeholder="Paste a link"
                aria-label="Link URL"
                className="px-1"
                value={linkUrl}
                onChange={(event) => {
                  const value = event.target.value;
                  setLinkUrl(value);
                  updateLink(value);
                }}
                autoFocus
                autoComplete="off"
              />
            </InputGroup>
          </motion.div>
        ) : (
          <motion.div
            key="toolbar-view"
            initial={{ opacity: 0, transform: "translateX(-8px)" }}
            animate={{ opacity: 1, transform: "translateX(0px)" }}
            exit={{ opacity: 0, transform: "translateX(8px)" }}
            transition={viewTransition}
            className="flex items-center gap-0"
          >
            {menuControls.map((control, index) => (
              <Fragment
                key={`${item.id}:${control.command}:${control.preset ?? control.label}`}
              >
                {index === firstAdditionalControlIndex && hasPresetControls ? (
                  <Separator
                    orientation="vertical"
                    className="mx-1 my-2 rounded-2xl bg-muted-foreground/60 data-vertical:w-0.5"
                  />
                ) : null}
                <Button
                  type="button"
                  size={
                    control.command === "apply-preset" ||
                    control.command === "manage-link" ||
                    control.command === "crop-media"
                      ? "icon-sm"
                      : "xs"
                  }
                  className={cn(
                    control.command === "apply-preset" ||
                      control.command === "manage-link" ||
                      control.command === "crop-media"
                      ? "cursor-pointer! rounded-md text-white hover:bg-white/20 hover:text-white"
                      : "cursor-pointer! rounded-full",
                    control.isActive && "bg-white text-black hover:bg-white/90",
                    control.command === "crop-media" &&
                      mediaCropInteraction?.isOpen &&
                      "bg-brand-green! text-white! hover:bg-brand-green! hover:text-white!",
                  )}
                  variant={
                    control.command === "apply-preset" ||
                    control.command === "manage-link" ||
                    control.command === "crop-media"
                      ? "ghost"
                      : "secondary"
                  }
                  aria-label={
                    control.command === "crop-media" &&
                    mediaCropInteraction?.isOpen
                      ? "Apply media crop"
                      : control.command === "crop-media"
                        ? "Crop media"
                        : control.label
                  }
                  aria-pressed={
                    control.command === "apply-preset"
                      ? control.isActive
                      : control.command === "crop-media"
                        ? mediaCropInteraction?.isOpen
                        : undefined
                  }
                  title={
                    control.command === "crop-media" &&
                    mediaCropInteraction?.isOpen
                      ? "Apply media crop"
                      : control.command === "crop-media"
                        ? "Crop media"
                        : control.label
                  }
                  disabled={
                    control.command === "crop-media" &&
                    mediaCropInteraction?.isOpen
                      ? !mediaCropInteraction.canApply
                      : undefined
                  }
                  onClick={() => {
                    if (control.command === "apply-preset" && control.preset) {
                      onCommand?.({
                        type: "apply-preset",
                        itemId: item.id,
                        preset: control.preset,
                      });
                      return;
                    }

                    if (control.command === "crop-media") {
                      if (mediaCropInteraction?.isOpen) {
                        mediaCropInteraction.apply();
                      } else {
                        mediaCropInteraction?.open();
                      }
                      return;
                    }

                    if (control.command === "manage-link") {
                      setLinkUrl(linkItem?.data.link ?? "");
                      setView("link");
                    }
                  }}
                >
                  {control.command === "apply-preset" && control.preset ? (
                    <PresetIcon
                      preset={control.preset}
                      className={control.isActive ? "text-black" : "text-white"}
                    />
                  ) : control.command === "manage-link" ? (
                    linkItem?.data.link ? (
                      <LinkIcon className="stroke-3" />
                    ) : (
                      <UnlinkIcon className="stroke-3" />
                    )
                  ) : control.command === "crop-media" ? (
                    <CropIcon className="size-4 stroke-3 text-white" />
                  ) : (
                    control.label
                  )}
                </Button>
              </Fragment>
            ))}
            {isMapItem ? (
              <>
                <Separator
                  orientation="vertical"
                  className="mx-1 my-2 rounded-2xl bg-muted-foreground/60 data-vertical:w-0.5"
                />
                <MapItemExtraControls />
              </>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
