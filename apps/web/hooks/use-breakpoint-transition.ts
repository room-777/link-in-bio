"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { Breakpoint } from "@/lib/handle/page-layout";

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<unknown> };
};

type UseBreakpointTransitionOptions = {
  previewBreakpoint: Breakpoint;
  setPreviewBreakpoint: (breakpoint: Breakpoint) => void;
  shouldReduceMotion: boolean | null;
};

export function useBreakpointTransition({
  previewBreakpoint,
  setPreviewBreakpoint,
  shouldReduceMotion,
}: UseBreakpointTransitionOptions) {
  const [breakpointTransition, setBreakpointTransition] = useState<
    "idle" | "out"
  >("idle");
  const isTransitioning = useRef(false);
  const timerRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      if (frameRef.current !== null)
        window.cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  async function changeBreakpoint(nextBreakpoint: Breakpoint) {
    if (nextBreakpoint === previewBreakpoint || isTransitioning.current) return;
    isTransitioning.current = true;
    try {
      const update = () => setPreviewBreakpoint(nextBreakpoint);
      const startViewTransition = (document as ViewTransitionDocument)
        .startViewTransition;
      if (shouldReduceMotion) {
        update();
        return;
      }
      if (startViewTransition) {
        const viewTransition = startViewTransition.call(document, () => {
          flushSync(update);
        });
        await viewTransition.finished;
        return;
      }
      setBreakpointTransition("out");
      await new Promise<void>((resolve) => {
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null;
          flushSync(update);
          frameRef.current = window.requestAnimationFrame(() => {
            frameRef.current = null;
            setBreakpointTransition("idle");
            resolve();
          });
        }, 80);
      });
    } finally {
      isTransitioning.current = false;
    }
  }

  return { breakpointTransition, changeBreakpoint };
}
