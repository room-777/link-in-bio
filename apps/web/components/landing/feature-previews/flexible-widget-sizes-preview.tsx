import { gridMargin, gridRowHeight } from "@grabbin/grid-layout";
import { Player } from "@remotion/player";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ItemControls } from "@/components/handle/grid/item-controls";
import {
  type GridItemCommandHandler,
  getItemCapabilities,
} from "@/lib/grid/item-registry";
import { getPresetGeometry } from "@/lib/grid/layout-engine";
import type { GridItemByType, PresetName } from "@/lib/grid/types";

const PRESETS = [
  "squareSmall",
  "landscape",
  "portrait",
  "squareLarge",
] as const satisfies readonly PresetName[];
const HOLD_FRAMES = 36;
const TRANSITION_FRAMES = 54;
const STEP_FRAMES = HOLD_FRAMES + TRANSITION_FRAMES;
const DURATION_IN_FRAMES = PRESETS.length * STEP_FRAMES;
const PREVIEW_SCALE = 0.9;
const EASE = Easing.bezier(0.23, 1, 0.32, 1);
const noopCommand: GridItemCommandHandler = () => undefined;
const MEDIA_PREVIEW_URL = "https://cdn.grabbin.me/assets/features/6.png";

export function FlexibleWidgetSizesPreview() {
  return (
    <Player
      component={FlexibleWidgetSizesComposition}
      durationInFrames={DURATION_IN_FRAMES}
      compositionWidth={640}
      compositionHeight={480}
      fps={60}
      autoPlay
      loop
      initiallyMuted
      controls={false}
      clickToPlay={false}
      acknowledgeRemotionLicense
      style={{ height: "100%", width: "100%", pointerEvents: "none" }}
    />
  );
}

function FlexibleWidgetSizesComposition() {
  const frame = useCurrentFrame();
  const { height: compositionHeight, width: compositionWidth } =
    useVideoConfig();
  const cycleFrame = frame % DURATION_IN_FRAMES;
  const stepIndex = Math.floor(cycleFrame / STEP_FRAMES);
  const stepFrame = cycleFrame % STEP_FRAMES;
  const startPreset = PRESETS[stepIndex];
  const endPreset = PRESETS[(stepIndex + 1) % PRESETS.length];
  const progress = interpolate(stepFrame, [HOLD_FRAMES, STEP_FRAMES], [0, 1], {
    easing: EASE,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const startSize = getPreviewSize(startPreset);
  const endSize = getPreviewSize(endPreset);
  const mediaWidth = interpolate(
    progress,
    [0, 1],
    [startSize.width, endSize.width],
  );
  const mediaHeight = interpolate(
    progress,
    [0, 1],
    [startSize.height, endSize.height],
  );
  const activePreset = progress > 0.08 ? endPreset : startPreset;
  const item = createPreviewMediaItem(activePreset);
  const capabilities = getItemCapabilities(item, {
    breakpoint: "wide",
    mode: "edit",
  });
  const previewCapabilities = {
    ...capabilities,
    controls: capabilities.controls.filter(
      ({ command }) => command !== "manage-link" && command !== "crop-media",
    ),
  };
  const controlsTop =
    (compositionHeight - mediaHeight - 12 - 40) / 2 + mediaHeight + 12;

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent" }}>
      <div
        className="surface-line"
        style={{
          position: "absolute",
          left: (compositionWidth - mediaWidth) / 2,
          top: (compositionHeight - mediaHeight - 12 - 40) / 2,
          width: mediaWidth,
          height: mediaHeight,
          overflow: "hidden",
          borderRadius: 16,
          background:
            "linear-gradient(135deg, oklch(0.78 0.12 310), oklch(0.72 0.14 230) 52%, oklch(0.82 0.13 155))",
          boxShadow: "0 8px 24px oklch(0 0 0 / 0.12)",
        }}
      >
        <Img
          src={MEDIA_PREVIEW_URL}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 75% 25%, oklch(1 0 0 / 0.6), transparent 32%), radial-gradient(circle at 25% 85%, oklch(1 0 0 / 0.28), transparent 38%)",
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: controlsTop,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <ItemControls
          item={item}
          capabilities={previewCapabilities}
          onCommand={noopCommand}
        />
      </div>
    </AbsoluteFill>
  );
}

function getPreviewSize(preset: PresetName) {
  const layout = getPresetGeometry(preset, "wide");
  const [horizontalMargin, verticalMargin] = gridMargin;
  const gridCellWidth = gridRowHeight * 2 + verticalMargin;

  return {
    width:
      (gridCellWidth * layout.w + horizontalMargin * (layout.w - 1)) *
      PREVIEW_SCALE,
    height:
      (gridRowHeight * layout.h + verticalMargin * (layout.h - 1)) *
      PREVIEW_SCALE,
  };
}

function createPreviewMediaItem(preset: PresetName): GridItemByType<"media"> {
  const layout = getPresetGeometry(preset, "wide");

  return {
    id: "flexible-widget-sizes-media",
    type: "media",
    style: {},
    data: {
      objectKey: "feature-preview",
      mimeType: "image/png",
    },
    layouts: {
      wide: layout,
      compact: getPresetGeometry(preset, "compact"),
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    preset,
  };
}
