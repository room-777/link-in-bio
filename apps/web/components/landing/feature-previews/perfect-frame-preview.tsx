import { gridMargin, gridRowHeight } from "@grabbin/grid-layout";
import { Player } from "@remotion/player";
import { CropIcon } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Button } from "@/components/ui/button";
import { getPresetGeometry } from "@/lib/grid/layout-engine";
import {
  getCenteredMediaCrop,
  getMediaCropStyle,
  type MediaFrameSize,
} from "@/lib/grid/media-crop";

const DURATION_IN_FRAMES = 360;
const CROP_OPEN_FRAME = 48;
const CROP_REVEAL_FRAMES = 24;
const CROP_HOLD_FRAMES = 24;
const CROP_CLOSE_FRAME = DURATION_IN_FRAMES - 24;
const CROP_REVEAL_END = CROP_OPEN_FRAME + CROP_REVEAL_FRAMES;
const CROP_MOVEMENT_START = CROP_REVEAL_END + CROP_HOLD_FRAMES;
const CROP_MOVEMENT_DURATION = CROP_CLOSE_FRAME - CROP_MOVEMENT_START;
const CONTROL_GAP = 12;
const PREVIEW_CONTROLS_SCALE = 0.8;
const DEFAULT_PREVIEW_SIZE = { width: 640, height: 480 };
const MEDIA_SOURCE_SIZE: MediaFrameSize = { width: 1080, height: 2400 };
const MEDIA_LAYOUT = getPresetGeometry("squareLarge", "wide");
const [horizontalMargin, verticalMargin] = gridMargin;
const gridCellWidth = gridRowHeight * 2 + verticalMargin;
const MEDIA_FRAME_SIZE: MediaFrameSize = {
  width:
    gridCellWidth * MEDIA_LAYOUT.w + horizontalMargin * (MEDIA_LAYOUT.w - 1),
  height:
    gridRowHeight * MEDIA_LAYOUT.h + verticalMargin * (MEDIA_LAYOUT.h - 1),
};
const MEDIA_ITEM_ASPECT_RATIO =
  MEDIA_FRAME_SIZE.width / MEDIA_FRAME_SIZE.height;
const MEDIA_PREVIEW_URL = "https://cdn.grabbin.me/assets/features/7.jpg";
const CENTERED_CROP = getCenteredMediaCrop(MEDIA_SOURCE_SIZE, MEDIA_FRAME_SIZE);
const CENTERED_CROP_STYLE = getMediaCropStyle(CENTERED_CROP);
const MEDIA_CROP_HEIGHT_FACTOR = 100 / CENTERED_CROP.height;
const MEDIA_CROP_TRAVEL_FACTOR =
  (100 - CENTERED_CROP.height) / CENTERED_CROP.height;
const MEDIA_CROP_BOUNDS_FACTOR =
  MEDIA_CROP_HEIGHT_FACTOR + MEDIA_CROP_TRAVEL_FACTOR;
const MEDIA_CROP_SAFE_SCALE = 0.9;
const PREVIEW_CONTROLS_WIDTH = 40;

export function PerfectFramePreview() {
  const previewRef = useRef<HTMLSpanElement>(null);
  const [previewSize, setPreviewSize] = useState(DEFAULT_PREVIEW_SIZE);

  useLayoutEffect(() => {
    const element = previewRef.current;
    if (!element) return;

    const updateSize = () => {
      const nextSize = {
        width: Math.max(1, Math.round(element.clientWidth)),
        height: Math.max(1, Math.round(element.clientHeight)),
      };
      setPreviewSize((currentSize) =>
        currentSize.width === nextSize.width &&
        currentSize.height === nextSize.height
          ? currentSize
          : nextSize,
      );
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <span
      ref={previewRef}
      className="relative block size-full overflow-hidden"
      style={{
        position: "relative",
        overflow: "hidden",
        width: "100%",
        height: "100%",
        opacity: 1,
      }}
    >
      <Player
        component={PerfectFrameComposition}
        durationInFrames={DURATION_IN_FRAMES}
        compositionWidth={previewSize.width}
        compositionHeight={previewSize.height}
        fps={60}
        autoPlay
        loop
        initiallyMuted
        controls={false}
        clickToPlay={false}
        acknowledgeRemotionLicense
        style={{ height: "100%", width: "100%", pointerEvents: "none" }}
      />
    </span>
  );
}

function PerfectFrameComposition() {
  const frame = useCurrentFrame();
  const { height: compositionHeight, width: compositionWidth } =
    useVideoConfig();
  const mediaScale = Math.min(
    1,
    compositionWidth / MEDIA_FRAME_SIZE.width,
    (compositionHeight / (MEDIA_FRAME_SIZE.height * MEDIA_CROP_BOUNDS_FACTOR)) *
      MEDIA_CROP_SAFE_SCALE,
  );
  const mediaWidth = MEDIA_FRAME_SIZE.width * mediaScale;
  const mediaHeight = MEDIA_FRAME_SIZE.height * mediaScale;
  const mediaTop =
    (compositionHeight - mediaHeight * MEDIA_CROP_BOUNDS_FACTOR) / 2 +
    mediaHeight * MEDIA_CROP_TRAVEL_FACTOR;
  const controlsTop =
    mediaTop + mediaHeight + CONTROL_GAP * PREVIEW_CONTROLS_SCALE;
  const isCropOpen = frame >= CROP_OPEN_FRAME && frame < DURATION_IN_FRAMES - 1;
  const isCropActive = frame >= CROP_OPEN_FRAME && frame < CROP_CLOSE_FRAME;
  const shouldShowCropShadow = isCropActive && frame >= CROP_REVEAL_END;
  const openingProgress = interpolate(
    frame,
    [CROP_OPEN_FRAME, CROP_REVEAL_END],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const movementFrame = Math.max(0, frame - CROP_MOVEMENT_START);
  const cropY = interpolate(
    Math.min(movementFrame, CROP_MOVEMENT_DURATION),
    [
      0,
      CROP_MOVEMENT_DURATION * 0.08,
      CROP_MOVEMENT_DURATION * 0.37,
      CROP_MOVEMENT_DURATION * 0.57,
      CROP_MOVEMENT_DURATION * 0.66,
      CROP_MOVEMENT_DURATION * 0.9,
      CROP_MOVEMENT_DURATION,
    ],
    [
      CENTERED_CROP.y,
      CENTERED_CROP.y,
      0,
      (100 - CENTERED_CROP.height) * 0.98,
      100 - CENTERED_CROP.height,
      CENTERED_CROP.y,
      CENTERED_CROP.y,
    ],
    {
      easing: [
        Easing.bezier(0.22, 1, 0.36, 1),
        Easing.bezier(0.33, 1, 0.68, 1),
        Easing.bezier(0.45, 0, 0.7, 1),
        Easing.bezier(0.33, 0, 0.68, 1),
        Easing.bezier(0.22, 1, 0.36, 1),
        Easing.bezier(0.65, 0, 0.84, 0.35),
      ],
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const closingProgress = interpolate(
    frame,
    [CROP_CLOSE_FRAME, DURATION_IN_FRAMES - 1],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const overlayOpacity = interpolate(
    frame,
    [
      CROP_OPEN_FRAME,
      CROP_MOVEMENT_START,
      CROP_CLOSE_FRAME,
      DURATION_IN_FRAMES - 1,
    ],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const animatedCropY =
    frame < CROP_OPEN_FRAME
      ? CENTERED_CROP.y
      : frame < CROP_MOVEMENT_START
        ? CENTERED_CROP.y
        : frame < CROP_CLOSE_FRAME
          ? cropY
          : CENTERED_CROP.y;
  const renderedCrop = { ...CENTERED_CROP, y: animatedCropY };
  const cropStyle = isCropOpen
    ? getMediaCropStyle(renderedCrop)
    : CENTERED_CROP_STYLE;
  const revealTop = interpolate(openingProgress, [0, 1], [CENTERED_CROP.y, 0]);
  const revealRight = interpolate(
    openingProgress,
    [0, 1],
    [100 - CENTERED_CROP.x - CENTERED_CROP.width, 0],
  );
  const revealBottom = interpolate(
    openingProgress,
    [0, 1],
    [100 - CENTERED_CROP.y - CENTERED_CROP.height, 0],
  );
  const revealLeft = interpolate(openingProgress, [0, 1], [CENTERED_CROP.x, 0]);
  const cropRevealStyle =
    frame >= CROP_OPEN_FRAME && frame < CROP_REVEAL_END
      ? {
          clipPath: `inset(${revealTop}% ${revealRight}% ${revealBottom}% ${revealLeft}% round 16px)`,
        }
      : frame >= CROP_CLOSE_FRAME && frame < DURATION_IN_FRAMES - 1
        ? {
            clipPath: `inset(${interpolate(closingProgress, [0, 1], [0, CENTERED_CROP.y])}% 0% ${interpolate(closingProgress, [0, 1], [0, 100 - CENTERED_CROP.y - CENTERED_CROP.height])}% 0% round 16px)`,
          }
        : undefined;

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent" }}>
      <div
        className="relative size-full overflow-hidden"
        style={{
          position: "relative",
          overflow: "hidden",
          width: "100%",
          height: "100%",
          opacity: 1,
        }}
      >
        <span
          className={`grid-item-card absolute rounded-2xl bg-background shadow-sm ${isCropOpen ? "overflow-visible" : "overflow-hidden"}`}
          style={{
            position: "absolute",
            left: (compositionWidth - mediaWidth) / 2,
            top: mediaTop,
            width: mediaWidth,
            height: mediaHeight,
            display: "block",
            aspectRatio: MEDIA_ITEM_ASPECT_RATIO,
          }}
        >
          <span className="relative z-10 block size-full min-h-0 rounded-[inherit]">
            <span
              className={`relative block size-full rounded-[inherit] bg-muted/30 ${isCropOpen ? "overflow-visible" : "overflow-hidden"}`}
              style={{ width: "100%", height: "100%" }}
            >
              <span
                className={`pointer-events-none absolute block rounded-[inherit] ${shouldShowCropShadow ? "smooth-shadow-lg" : ""}`}
                style={cropStyle}
              >
                <span
                  className="relative block size-full overflow-hidden rounded-[inherit]"
                  style={cropRevealStyle}
                >
                  <Img
                    src={MEDIA_PREVIEW_URL}
                    alt=""
                    style={{
                      display: "block",
                      height: "100%",
                      width: "100%",
                    }}
                  />
                  {isCropOpen ? (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 z-10 block overflow-hidden rounded-[inherit]"
                      style={{ opacity: overlayOpacity }}
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
                    </span>
                  ) : null}
                </span>
              </span>
              {isCropOpen ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-30 block rounded-[inherit] border-[3px] border-black shadow-none"
                  style={{ opacity: overlayOpacity }}
                />
              ) : null}
            </span>
          </span>
        </span>
        <span
          className="absolute left-0 right-0 z-20 flex justify-center"
          style={{ top: controlsTop, display: "flex", zIndex: 20 }}
        >
          <PreviewItemControls isCropOpen={isCropActive} />
        </span>
      </div>
    </AbsoluteFill>
  );
}

function PreviewItemControls({ isCropOpen }: { isCropOpen: boolean }) {
  return (
    <span
      className="flex h-10 flex-nowrap items-center gap-0.5 overflow-hidden rounded-lg bg-black p-1 shadow-lg"
      style={{
        pointerEvents: "none",
        transform: `scale(${PREVIEW_CONTROLS_SCALE})`,
        transformOrigin: "top center",
        width: PREVIEW_CONTROLS_WIDTH,
      }}
    >
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label={isCropOpen ? "Apply media crop" : "Crop media"}
        title={isCropOpen ? "Apply media crop" : "Crop media"}
        aria-pressed={isCropOpen}
        tabIndex={-1}
        aria-disabled="true"
        className={`cursor-pointer! rounded-md text-white hover:bg-white/20 hover:text-white ${isCropOpen ? "bg-brand-green! text-white!" : ""}`}
      >
        <CropIcon className="size-4 stroke-3 text-white" />
      </Button>
    </span>
  );
}
