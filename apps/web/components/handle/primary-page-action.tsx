"use client";

import type { OwnedPageListResponse } from "@grabbin/api";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ownedPagesQueryKey } from "@/lib/client/page-api";

export function PrimaryPageAction({ handle }: { handle: string }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<
    "idle" | "setting" | "success" | "fading" | "hidden"
  >("idle");
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  async function setPrimary() {
    if (state !== "idle") return;
    setState("setting");
    const response = await fetch(
      `/api/pages/${encodeURIComponent(handle)}/primary`,
      { method: "PATCH", credentials: "include" },
    ).catch(() => null);
    if (!response?.ok) {
      setState("idle");
      return;
    }

    queryClient.setQueryData<OwnedPageListResponse | undefined>(
      ownedPagesQueryKey,
      (current) =>
        current
          ? {
              ...current,
              pages: current.pages.map((candidate) => ({
                ...candidate,
                isPrimary: candidate.handle === handle,
              })),
            }
          : current,
    );
    setState("success");
    timer.current = window.setTimeout(() => {
      setState("fading");
      timer.current = window.setTimeout(() => setState("hidden"), 500);
    }, 1800);
  }

  if (state === "hidden") return null;

  return (
    <div
      className={`mt-20 w-fit transition-opacity duration-500 ease-out motion-reduce:transition-none ${state === "fading" ? "opacity-0" : "opacity-100"}`}
    >
      <Button
        type="button"
        variant="secondary"
        className="t-copy-button w-fit rounded-lg text-muted-foreground"
        data-state={
          state === "success" || state === "fading" ? "copied" : "idle"
        }
        disabled={state === "setting"}
        aria-busy={state === "setting"}
        onClick={() => void setPrimary()}
      >
        <span className="t-copy-feedback" aria-live="polite">
          <span className="t-copy-labels">
            <span className="t-copy-label t-copy-label-idle inline-flex items-center gap-1.5">
              set as primary page
            </span>
            <span className="t-copy-label t-copy-label-copied">
              Now it's your primary page!
            </span>
          </span>
        </span>
      </Button>
    </div>
  );
}
