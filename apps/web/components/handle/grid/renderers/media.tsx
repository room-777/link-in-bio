import type { NormalizedCrop } from "@grabbin/api";
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ItemCaption } from "@/components/handle/grid/item-caption";
import { ItemExternalAction } from "@/components/handle/grid/item-external-action";
import { useMediaCropInteraction } from "@/components/handle/grid/media-crop-interaction-context";
import type { ItemRendererProps } from "@/lib/grid/item-registry";
import {
  getCenteredMediaCrop,
  getMediaCropStyle,
  isMediaCropAspectCompatible,
  type MediaFrameSize,
  type MediaSourceSize,
  moveMediaCrop,
} from "@/lib/grid/media-crop";
import type { GridItemByType } from "@/lib/grid/types";
import { getMediaImageSources } from "@/lib/image/media-image-url";
import { cn } from "@/lib/utils";

function MediaAction({ href }: { href: string | undefined }) {
  if (!href) {
    return null;
  }

  return <ItemExternalAction href={href} ariaLabel="Open media" />;
}

export function MediaItemRenderer({
  item,
  breakpoint,
  preset,
  mode,
  onCommand,
}: ItemRendererProps<GridItemByType<"media">>) {
  const isVideo = item.data.mimeType.startsWith("video/");
  const linkedUrl = item.data.link;
  const cropInteraction = useMediaCropInteraction();
  const mediaFrameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cropDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startCrop: NormalizedCrop;
  } | null>(null);
  const [sourceSize, setSourceSize] = useState<MediaSourceSize | null>(null);
  const [frameSize, setFrameSize] = useState<MediaFrameSize>({
    width: 0,
    height: 0,
  });
  const [draftCrop, setDraftCrop] = useState<NormalizedCrop | null>(null);
  const [isCropClosing, setIsCropClosing] = useState(false);
  const previousCropOpenRef = useRef(false);
  const lastCropRef = useRef<NormalizedCrop | null>(null);

  const mediaSource = item.data.mediaUrl;
  const shouldRenderMedia = Boolean(mediaSource);
  const imageSources = useMemo(
    () => (mediaSource ? getMediaImageSources(mediaSource) : null),
    [mediaSource],
  );
  useLayoutEffect(() => {
    setSourceSize(null);
    if (!shouldRenderMedia || !mediaSource) return;

    if (isVideo) {
      const video = videoRef.current;
      if (
        video &&
        video.getAttribute("src") === mediaSource &&
        video.readyState >= HTMLMediaElement.HAVE_METADATA &&
        video.videoWidth > 0 &&
        video.videoHeight > 0
      ) {
        setSourceSize({
          width: video.videoWidth,
          height: video.videoHeight,
        });
      }
      return;
    }

    const image = imageRef.current;
    if (image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0) {
      setSourceSize({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    }
  }, [isVideo, mediaSource, shouldRenderMedia]);

  const persistedCrop = item.data.crop?.[breakpoint];
  const shouldMeasureFrame = Boolean(
    persistedCrop || cropInteraction.isOpen || isCropClosing,
  );
  useEffect(() => {
    if (!shouldMeasureFrame) return;
    const mediaFrame = mediaFrameRef.current;
    if (!mediaFrame) return;

    const updateFrameSize = (width: number, height: number) => {
      setFrameSize((currentSize) =>
        currentSize.width === width && currentSize.height === height
          ? currentSize
          : { width, height },
      );
    };
    const rect = mediaFrame.getBoundingClientRect();
    updateFrameSize(rect.width, rect.height);
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      updateFrameSize(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(mediaFrame);
    return () => observer.disconnect();
  }, [shouldMeasureFrame]);
  const hasFrameSize = frameSize.width > 0 && frameSize.height > 0;
  const centeredCrop = useMemo(() => {
    if (!sourceSize || !hasFrameSize) return null;
    return getCenteredMediaCrop(sourceSize, frameSize);
  }, [frameSize, hasFrameSize, sourceSize]);

  const getInitialCrop = useCallback(() => {
    if (!sourceSize || !hasFrameSize) return null;
    if (
      persistedCrop &&
      isMediaCropAspectCompatible(persistedCrop, sourceSize, frameSize)
    )
      return persistedCrop;
    return centeredCrop;
  }, [centeredCrop, frameSize, hasFrameSize, persistedCrop, sourceSize]);

  const compatiblePersistedCrop =
    persistedCrop &&
    sourceSize &&
    hasFrameSize &&
    isMediaCropAspectCompatible(persistedCrop, sourceSize, frameSize)
      ? persistedCrop
      : null;
  const renderedCrop = cropInteraction.isOpen
    ? (draftCrop ?? centeredCrop)
    : (compatiblePersistedCrop ?? (persistedCrop ? centeredCrop : null));
  const isClosingFrame = previousCropOpenRef.current && !cropInteraction.isOpen;
  const isCropVisible =
    cropInteraction.isOpen || isCropClosing || isClosingFrame;
  const displayedCrop =
    !cropInteraction.isOpen && isCropVisible
      ? (lastCropRef.current ?? renderedCrop)
      : renderedCrop;
  const cropStyle =
    displayedCrop &&
    sourceSize &&
    hasFrameSize &&
    isMediaCropAspectCompatible(displayedCrop, sourceSize, frameSize)
      ? getMediaCropStyle(displayedCrop)
      : undefined;
  const cropRevealStyle = displayedCrop
    ? ({
        "--media-crop-reveal-top": `${displayedCrop.y}%`,
        "--media-crop-reveal-right": `${Math.max(
          0,
          100 - displayedCrop.x - displayedCrop.width,
        )}%`,
        "--media-crop-reveal-bottom": `${Math.max(
          0,
          100 - displayedCrop.y - displayedCrop.height,
        )}%`,
        "--media-crop-reveal-left": `${displayedCrop.x}%`,
      } as CSSProperties)
    : undefined;

  useLayoutEffect(() => {
    previousCropOpenRef.current = cropInteraction.isOpen;
    if (cropInteraction.isOpen && renderedCrop) {
      lastCropRef.current = renderedCrop;
    }
  }, [cropInteraction.isOpen, renderedCrop]);

  useEffect(() => {
    if (isClosingFrame) setIsCropClosing(true);
  }, [isClosingFrame]);

  useEffect(() => {
    if (cropInteraction.isOpen) {
      setIsCropClosing(false);
      return;
    }
    if (!isCropClosing) return;

    const duration =
      Number.parseFloat(
        getComputedStyle(
          mediaFrameRef.current ?? document.documentElement,
        ).getPropertyValue("--profile-image-reveal-dur"),
      ) || 400;
    const timer = window.setTimeout(() => {
      setIsCropClosing(false);
      lastCropRef.current = null;
    }, duration);

    return () => window.clearTimeout(timer);
  }, [cropInteraction.isOpen, isCropClosing]);
  const canApply = Boolean(
    mode === "edit" &&
      onCommand &&
      sourceSize &&
      hasFrameSize &&
      draftCrop &&
      isMediaCropAspectCompatible(draftCrop, sourceSize, frameSize),
  );
  const cropActionStateRef = useRef({
    canApply,
    draftCrop,
    getInitialCrop,
    item,
    breakpoint,
    onCommand,
  });
  cropActionStateRef.current = {
    canApply,
    draftCrop,
    getInitialCrop,
    item,
    breakpoint,
    onCommand,
  };

  const handleCropOpen = useCallback(() => {
    setDraftCrop(cropActionStateRef.current.getInitialCrop());
  }, []);
  const handleCropCancel = useCallback(() => {
    cropDragRef.current = null;
    setDraftCrop(null);
  }, []);
  const handleCropApply = useCallback(() => {
    const { canApply, draftCrop, item, breakpoint, onCommand } =
      cropActionStateRef.current;
    if (!canApply || !draftCrop || !onCommand) return;
    onCommand({
      type: "update-data",
      itemId: item.id,
      data: {
        ...item.data,
        crop: {
          ...item.data.crop,
          [breakpoint]: draftCrop,
        },
      },
    });
    setDraftCrop(null);
  }, []);

  useEffect(() => {
    return cropInteraction.registerActions({
      breakpoint,
      canApply,
      onOpen: handleCropOpen,
      onCancel: handleCropCancel,
      onApply: handleCropApply,
    });
  }, [
    breakpoint,
    canApply,
    cropInteraction.registerActions,
    handleCropApply,
    handleCropCancel,
    handleCropOpen,
  ]);

  const previousBreakpointRef = useRef(breakpoint);
  useEffect(() => {
    if (previousBreakpointRef.current === breakpoint) return;
    previousBreakpointRef.current = breakpoint;
    if (cropInteraction.isOpen) cropInteraction.cancel();
  }, [breakpoint, cropInteraction.cancel, cropInteraction.isOpen]);

  useEffect(() => {
    if (!cropInteraction.isOpen || !sourceSize || !hasFrameSize) return;
    setDraftCrop((currentCrop) =>
      currentCrop &&
      isMediaCropAspectCompatible(currentCrop, sourceSize, frameSize)
        ? currentCrop
        : getCenteredMediaCrop(sourceSize, frameSize),
    );
  }, [cropInteraction.isOpen, frameSize, hasFrameSize, sourceSize]);

  function updateSourceSize(nextSize: MediaSourceSize) {
    if (nextSize.width <= 0 || nextSize.height <= 0) return;
    setSourceSize((currentSize) =>
      currentSize?.width === nextSize.width &&
      currentSize.height === nextSize.height
        ? currentSize
        : nextSize,
    );
  }

  function handleImageLoad(event: SyntheticEvent<HTMLImageElement>) {
    updateSourceSize({
      width: event.currentTarget.naturalWidth,
      height: event.currentTarget.naturalHeight,
    });
  }

  function handleVideoMetadata(event: SyntheticEvent<HTMLVideoElement>) {
    updateSourceSize({
      width: event.currentTarget.videoWidth,
      height: event.currentTarget.videoHeight,
    });
  }

  function handleImageError(event: SyntheticEvent<HTMLImageElement>) {
    if (!mediaSource) return;
    const image = event.currentTarget;
    if (image.dataset.originalSource === mediaSource) return;
    image.dataset.originalSource = mediaSource;
    image.src = mediaSource;
    image.removeAttribute("srcset");
  }

  function handleCropPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!cropInteraction.isOpen || !draftCrop) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    cropDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startCrop: draftCrop,
    };
    cropInteraction.setDragging(true);
  }

  function handleCropPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = cropDragRef.current;
    if (
      !drag ||
      drag.pointerId !== event.pointerId ||
      !cropInteraction.isOpen ||
      !hasFrameSize
    )
      return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (deltaX === 0 && deltaY === 0) return;
    event.preventDefault();
    setDraftCrop(moveMediaCrop(drag.startCrop, deltaX, deltaY, frameSize));
  }

  function handleCropPointerEnd(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = cropDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    cropDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    cropInteraction.setDragging(false);
  }

  const mediaElement =
    !shouldRenderMedia || !mediaSource ? null : isVideo ? (
      <video
        ref={videoRef}
        src={mediaSource}
        autoPlay
        preload="metadata"
        muted
        loop
        playsInline
        onLoadedMetadata={handleVideoMetadata}
        className={cn(
          "pointer-events-none absolute inset-0",
          cropStyle ? "size-full rounded-[inherit]" : "size-full object-cover",
        )}
      />
    ) : (
      <img
        ref={imageRef}
        src={imageSources?.src}
        srcSet={imageSources?.srcSet}
        sizes="(min-width: 90rem) 840px, 100vw"
        alt={item.data.caption ?? "Media item"}
        loading="lazy"
        decoding="async"
        fetchPriority="low"
        onLoad={handleImageLoad}
        onError={handleImageError}
        className={cn(
          "pointer-events-none absolute inset-0",
          cropStyle ? "size-full rounded-[inherit]" : "size-full object-cover",
        )}
      />
    );

  return (
    <div
      ref={mediaFrameRef}
      data-media-frame="true"
      data-media-preset={preset}
      className={cn(
        "relative size-full overflow-hidden rounded-[inherit] bg-muted/30",
        !isCropVisible &&
          sourceSize !== null &&
          !mediaSource?.startsWith("data:") &&
          "surface-line",
        isCropVisible && "overflow-visible!",
      )}
    >
      {cropStyle ? (
        <div
          data-media-crop-source="true"
          className={cn(
            "pointer-events-none absolute rounded-[inherit]",
            isCropVisible && "smooth-shadow-lg",
          )}
          style={cropStyle}
        >
          <div
            className={cn(
              "relative size-full overflow-hidden rounded-[inherit]",
              cropInteraction.isOpen
                ? "t-media-crop-reveal"
                : isCropVisible && "t-media-crop-reveal is-closing",
            )}
            style={isCropVisible ? cropRevealStyle : undefined}
          >
            {mediaElement}
            {cropInteraction.isOpen && renderedCrop ? (
              <div
                aria-hidden="true"
                data-media-crop-mask="true"
                className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[inherit]"
              >
                <span
                  className="pointer-events-none absolute rounded-[inherit]"
                  style={{
                    left: `${renderedCrop.x}%`,
                    top: `${renderedCrop.y}%`,
                    width: `${renderedCrop.width}%`,
                    height: `${renderedCrop.height}%`,
                    boxShadow: "0 0 0 9999px rgb(255 255 255 / 0.35)",
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        mediaElement
      )}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 flex min-w-0 items-center justify-between gap-3 p-4 text-white",
        )}
      >
        <ItemCaption
          mode={mode}
          value={item.data.caption}
          onChange={(caption) =>
            onCommand?.({
              type: "update-data",
              itemId: item.id,
              data: { ...item.data, caption },
            })
          }
        />
        {linkedUrl ? (
          <div className="pointer-events-auto flex h-fit shrink-0 items-center">
            <MediaAction href={linkedUrl} />
          </div>
        ) : null}
      </div>
      {mode === "edit" && isCropVisible && cropStyle ? (
        <>
          <button
            type="button"
            data-grid-item-drag-cancel="true"
            aria-label="Drag media to crop"
            className={cn(
              "absolute z-20 m-0 block cursor-grab! touch-none appearance-none rounded-[inherit] border-0 bg-transparent p-0 outline-none",
              isCropClosing && "pointer-events-none",
              cropInteraction.isDragging && "cursor-grabbing!",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black",
            )}
            style={cropStyle}
            onPointerDown={handleCropPointerDown}
            onPointerMove={handleCropPointerMove}
            onPointerUp={handleCropPointerEnd}
            onPointerCancel={handleCropPointerEnd}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-30 rounded-[inherit] border-[3px] border-black shadow-none"
          />
        </>
      ) : null}
    </div>
  );
}
