"use client";

import type { ReactNode } from "react";
import {
  type Breakpoint,
  getPageLayoutClasses,
} from "@/lib/handle/page-layout";

type PublicHandleShellProps = {
  profile: ReactNode;
  grid: ReactNode;
  controls: ReactNode;
  breakpoint: Breakpoint;
  breakpointTransition?: "idle" | "out";
  toolbar?: ReactNode;
  ownerTools?: ReactNode;
};

export function PublicHandleShell({
  profile,
  grid,
  controls,
  breakpoint,
  breakpointTransition = "idle",
  toolbar,
  ownerTools,
}: PublicHandleShellProps) {
  const layoutClasses = getPageLayoutClasses(breakpoint);
  const isCompactPreview = breakpoint === "compact";
  return (
    <main
      className={`page-scroll-container relative box-border min-h-dvh w-full ${isCompactPreview ? "overscroll-y-none overflow-y-hidden bg-secondary min-[90rem]:items-center" : "overflow-y-auto bg-background min-[90rem]:items-start"} no-scrollbar min-[90rem]:flex min-[90rem]:h-dvh min-[90rem]:justify-center`}
    >
      <div
        className={`t-breakpoint-frame flex w-full flex-col items-center gap-8 ${isCompactPreview ? "overscroll-y-none min-[90rem]:h-[calc(100dvh-14rem)] min-[90rem]:min-h-0 min-[90rem]:w-120 min-[90rem]:max-w-[calc(100vw-2rem)] min-[90rem]:overflow-y-auto no-scrollbar bg-background min-[90rem]:rounded-[3.5rem] min-[90rem]:py-4 shadow-float-lg" : "min-[90rem]:h-auto min-[90rem]:min-h-dvh overflow-visible min-[90rem]:bg-transparent min-[90rem]:rounded-none"} min-[90rem]:max-w-none ${layoutClasses.shell}`}
      >
        <div
          className={`flex min-w-0 w-full max-w-md flex-col ${layoutClasses.profile}`}
        >
          <aside
            id="page-profile"
            data-breakpoint-transition={breakpointTransition}
            className={`t-breakpoint-content flex min-h-0 w-full flex-1 flex-col gap-8 p-6 px-12 pt-12 ${layoutClasses.profileAside}`}
          >
            {profile}
          </aside>
        </div>

        <section
          id="page-grid"
          data-breakpoint-transition={breakpointTransition}
          className={`t-breakpoint-content grid-content-scroll-shell min-h-[calc(100dvh-3rem)] w-full overflow-visible p-0 pt-0 sm:max-w-md no-scrollbar min-[90rem]:px-0 min-[90rem]:pb-24 ${layoutClasses.content}`}
        >
          <div className="flex flex-col gap-4">{grid}</div>
        </section>
      </div>

      {controls}
      {toolbar}
      {ownerTools}
    </main>
  );
}
