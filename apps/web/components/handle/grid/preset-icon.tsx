import type { SVGProps } from "react";
import type { PresetName } from "@/lib/grid/types";
import { cn } from "@/lib/utils";

type PresetRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
};

const presetRectByName: Record<PresetName, PresetRect> = {
  fullBanner: { x: 2, y: 10, width: 20, height: 4, rx: 2.5 },
  halfBanner: { x: 2, y: 8, width: 20, height: 8, rx: 2.5 },
  squareSmall: { x: 7, y: 7, width: 10, height: 10, rx: 2.5 },
  landscape: { x: 2, y: 6, width: 20, height: 12, rx: 2.5 },
  squareLarge: { x: 3, y: 3, width: 18, height: 18, rx: 2.5 },
  portrait: { x: 7, y: 2, width: 10, height: 20, rx: 2.5 },
};

type PresetIconProps = Omit<SVGProps<SVGSVGElement>, "viewBox"> & {
  preset: PresetName;
};

export function PresetIcon({ preset, className, ...props }: PresetIconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={cn("size-4", className)}
      {...props}
    >
      <rect
        {...presetRectByName[preset]}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      />
    </svg>
  );
}
