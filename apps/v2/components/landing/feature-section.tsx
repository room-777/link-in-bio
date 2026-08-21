"use client";

import { Player } from "@remotion/player";
import { Monitor, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  interpolateColors,
  useCurrentFrame,
} from "remotion";
import { FlexibleWidgetSizesPreview } from "./feature-previews/flexible-widget-sizes-preview";
import { PerfectFramePreview } from "./feature-previews/perfect-frame-preview";
import { RichContentPreview } from "./feature-previews/rich-content-preview";

const FEATURE_ITEMS = [
  {
    title: "A widget for everything",
    description:
      "Bring links, text, images, videos, maps, and more together on one page.",
    preview: "rich-content",
  },
  {
    title: "Flexible widget sizes",
    description: "Choose the size that works best for each piece of content.",
    preview: "flexible-widget-sizes",
  },
  {
    title: "Perfect the frame",
    description:
      "Crop and position every image so it looks right in your layout.",
    preview: "perfect-the-frame",
  },
  {
    title: "One page, every screen",
    description:
      "Switch between mobile and desktop layouts to keep your page looking great everywhere.",
    preview: "drag-drop",
  },
] as const;

export default function FeatureSection({
  mapboxAccessToken,
}: {
  mapboxAccessToken?: string;
}) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => setIsMounted(true), []);

  return (
    <section className="mx-auto flex min-h-lvh max-w-6xl flex-col items-center gap-4 py-20">
      <header className="flex flex-col items-center gap-8 text-center mb-8">
        <h2 className="flex flex-col items-center text-4xl font-semibold md:text-5xl">
          <span>Everything you are.</span>
          <span>In one place.</span>
        </h2>
        <div>
          <p className="text-lg font-medium text-balance md:text-xl">
            Bring your links, content, and favorite places together.
          </p>
          <p className="text-lg font-medium text-balance text-gray-bright md:text-xl">
            Share a page that feels like you.
          </p>
        </div>
      </header>

      <div className="grid w-full gap-4 md:grid-cols-2">
        {FEATURE_ITEMS.map(({ title, description, preview }, index) => (
          <article
            className={
              "flex h-full min-h-0 flex-col gap-6 rounded-3xl bg-secondary/60 " +
              (index === 0 ? "md:col-span-2 " : "") +
              (index === 1 ? "md:col-start-2 md:row-start-2 " : "") +
              (index === 2
                ? "md:col-start-1 md:row-start-2 md:row-span-2 "
                : "") +
              (index === 3 ? "md:col-start-2 md:row-start-3" : "")
            }
            key={title}
          >
            <header className="flex flex-col gap-1 p-6">
              <h3 className="text-2xl font-medium tracking-tight">{title}</h3>
              <p className="text-base leading-relaxed text-gray-bright">
                {description}
              </p>
            </header>
            <div
              className={
                "mx-6 mb-6 min-h-[18rem] flex-1 rounded-2xl " +
                (preview === "rich-content"
                  ? "flex items-center justify-center min-h-[20rem] overflow-visible bg-background p-2 md:min-h-[40rem]"
                  : "overflow-hidden bg-background " +
                    (preview === "flexible-widget-sizes"
                      ? "md:min-h-[24rem]"
                      : ""))
              }
            >
              {isMounted ? (
                preview === "drag-drop" ? (
                  <DragDropPreview />
                ) : null
              ) : null}
              {isMounted && preview === "rich-content" ? (
                <RichContentPreview mapboxAccessToken={mapboxAccessToken} />
              ) : null}
              {isMounted && preview === "flexible-widget-sizes" ? (
                <FlexibleWidgetSizesPreview />
              ) : null}
              {isMounted && preview === "perfect-the-frame" ? (
                <PerfectFramePreview />
              ) : null}
            </div>
          </article>
        ))}
      </div>
      <p className="text-center text-base text-gray-bright md:text-xl">
        More features may be added over time.
      </p>
    </section>
  );
}

function DragDropPreview() {
  return (
    <Player
      acknowledgeRemotionLicense
      autoPlay
      clickToPlay={false}
      component={BreakpointToolbarComposition}
      compositionHeight={480}
      compositionWidth={640}
      controls={false}
      durationInFrames={240}
      fps={60}
      initiallyMuted
      loop
      style={{ height: "100%", width: "100%", pointerEvents: "none" }}
    />
  );
}

const BREAKPOINT_EASE = Easing.bezier(0.22, 1, 0.36, 1);
const BREAKPOINT_BUTTON_SIZE = 104;
const BREAKPOINT_BUTTON_GAP = 8;
const BREAKPOINT_TABS_WIDTH =
  BREAKPOINT_BUTTON_SIZE * 2 + BREAKPOINT_BUTTON_GAP;

function BreakpointToolbarComposition() {
  const frame = useCurrentFrame() % 240;
  const desktopToMobile = interpolate(frame, [48, 96], [0, 1], {
    easing: BREAKPOINT_EASE,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const mobileToDesktop = interpolate(frame, [168, 216], [0, 1], {
    easing: BREAKPOINT_EASE,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const activeProgress = frame < 168 ? desktopToMobile : 1 - mobileToDesktop;
  const pillX = interpolate(
    activeProgress,
    [0, 1],
    [0, BREAKPOINT_BUTTON_SIZE + BREAKPOINT_BUTTON_GAP],
  );
  const desktopColor = interpolateColors(
    activeProgress,
    [0, 1],
    ["#ffffff", "#000000"],
  );
  const mobileColor = interpolateColors(
    activeProgress,
    [0, 1],
    ["#000000", "#ffffff"],
  );

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        backgroundColor: "transparent",
        justifyContent: "center",
      }}
    >
      <div
        className="flex items-center overflow-hidden rounded-full bg-background p-1.5 smooth-shadow-ring-sm shadow-black smooth-ring-neutral-300/30"
        style={{
          borderRadius: 40,
          display: "flex",
          gap: BREAKPOINT_BUTTON_GAP,
          padding: 8,
          position: "relative",
          width: BREAKPOINT_TABS_WIDTH + 16,
        }}
      >
        <div
          style={{
            backgroundColor: "#000000",
            borderRadius: 32,
            height: BREAKPOINT_BUTTON_SIZE,
            left: 8,
            position: "absolute",
            top: 8,
            translate: `${pillX}px 0px`,
            width: BREAKPOINT_BUTTON_SIZE,
          }}
        />
        <div
          aria-hidden="true"
          style={{
            alignItems: "center",
            color: desktopColor,
            display: "flex",
            height: BREAKPOINT_BUTTON_SIZE,
            justifyContent: "center",
            position: "relative",
            width: BREAKPOINT_BUTTON_SIZE,
          }}
        >
          <Monitor size={56} strokeWidth={2} />
        </div>
        <div
          aria-hidden="true"
          style={{
            alignItems: "center",
            color: mobileColor,
            display: "flex",
            height: BREAKPOINT_BUTTON_SIZE,
            justifyContent: "center",
            position: "relative",
            width: BREAKPOINT_BUTTON_SIZE,
          }}
        >
          <Smartphone size={56} strokeWidth={2} />
        </div>
      </div>
    </AbsoluteFill>
  );
}
