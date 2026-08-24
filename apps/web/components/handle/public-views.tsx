"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getPublicViewsQueryOptions } from "@/lib/client/public-views-api";

const REEL_SPINS = 3;
const REEL_DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const REEL_SEQUENCE = Array.from(
  { length: (REEL_SPINS + 1) * REEL_DIGITS.length },
  (_, index) => REEL_DIGITS[index % REEL_DIGITS.length],
);

function SpinningCounter({ value }: { value: number }) {
  const digitString = String(value);
  const stripRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    for (const strip of stripRefs.current) {
      if (!strip) continue;
      strip.style.transition = "none";
      strip.style.transform = "translateY(0)";
      void strip.offsetHeight;
    }

    const frame = requestAnimationFrame(() => {
      for (const [index, strip] of stripRefs.current.entries()) {
        if (!strip) continue;
        const styles = getComputedStyle(strip);
        const cellSize =
          Number.parseFloat(styles.getPropertyValue("--reel-cell")) || 30;
        const stagger =
          Number.parseFloat(styles.getPropertyValue("--reel-stagger")) || 90;
        const digit = Number(digitString[index] ?? 0);

        strip.style.transition = `transform var(--reel-dur) var(--reel-ease) ${index * stagger}ms`;
        strip.style.transform = `translateY(-${(REEL_SPINS * 10 + digit) * cellSize}px)`;
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [digitString]);

  return (
    <span className="t-reel" aria-hidden="true">
      {[...digitString].map((_, index) => (
        <span className="t-reel-col" key={`reel-${index.toString(36)}`}>
          <span
            className="t-reel-strip"
            ref={(element) => {
              stripRefs.current[index] = element;
            }}
          >
            {REEL_SEQUENCE.map((digit, sequenceIndex) => (
              <span
                className="t-reel-digit"
                key={`${digit}-${Math.floor(sequenceIndex / REEL_DIGITS.length)}`}
              >
                {digit}
              </span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}

export function PublicViews({ pageId }: { pageId: string }) {
  const [timezone, setTimezone] = useState<string | null>(null);

  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  }, []);

  const query = useQuery({
    ...getPublicViewsQueryOptions(pageId, timezone ?? "UTC"),
    enabled: timezone !== null,
    throwOnError: false,
  });
  const views = query.data;

  if (timezone === null || query.isPending) {
    return <Skeleton aria-busy="true" className="h-8 w-24 rounded-md" />;
  }

  if (query.isError || !views) return null;

  const todayViews = views.todayViews ?? 0;
  const yesterdayViews = views.yesterdayViews ?? 0;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="rounded-md text-sm text-muted-foreground/80"
            aria-label={`${todayViews} views today`}
          />
        }
      >
        <SpinningCounter value={todayViews} />
        <span className="ml-1">views today</span>
      </TooltipTrigger>
      <TooltipContent>{`${yesterdayViews} views yesterday`}</TooltipContent>
    </Tooltip>
  );
}
