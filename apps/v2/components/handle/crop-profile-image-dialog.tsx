"use client";

import type { ProfileImageCrop } from "@grabbin/api";
import { motion, useReducedMotion } from "motion/react";
import { type RefObject, useEffect, useState } from "react";
import type { ProfileImageSourceSize } from "@/lib/image/crop-image";

type CropProfileImageDialogProps = {
  open: boolean;
  crop: ProfileImageCrop;
  sourceSize: ProfileImageSourceSize | null;
  anchorRef: RefObject<HTMLElement | null>;
  applyRequestRef: { current: (() => void) | null };
  onOpenChange: (open: boolean) => void;
  onApply: (crop: ProfileImageCrop) => Promise<void>;
  onApplyingChange: (applying: boolean) => void;
};

export function CropProfileImageDialog({
  open,
  crop,
  sourceSize,
  anchorRef,
  applyRequestRef,
  onOpenChange,
  onApply,
  onApplyingChange,
}: CropProfileImageDialogProps) {
  const reduceMotion = useReducedMotion();
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setApplying(false);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    onApplyingChange(applying);
    return () => onApplyingChange(false);
  }, [applying, onApplyingChange]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !applying) {
        event.preventDefault();
        onOpenChange(false);
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (applying) return;
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest("[data-profile-crop-apply]")
      )
        return;
      if (target instanceof Node && anchorRef.current?.contains(target)) return;
      onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [anchorRef, applying, onOpenChange, open]);

  async function apply() {
    if (!sourceSize || applying) return;
    setApplying(true);
    setError(null);
    try {
      await onApply(crop);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to crop the profile image.",
      );
    } finally {
      setApplying(false);
    }
  }

  applyRequestRef.current = () => void apply();

  return (
    <motion.div
      initial={false}
      animate={open ? { opacity: 1 } : { opacity: 0 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: open ? 0.12 : 0.08, ease: "easeOut" }
      }
      className={`pointer-events-none absolute inset-0 z-40 overflow-visible ${open ? "" : "invisible"}`}
      role="region"
      aria-label="Crop profile image"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 rounded-full border-[3px] border-black shadow-none"
      />
      {error ? (
        <p className="absolute top-1/2 right-0 z-30 translate-x-[calc(100%+0.75rem)] -translate-y-1/2 bg-background p-2 text-center text-xs font-medium text-destructive/80">
          {error}
        </p>
      ) : null}
    </motion.div>
  );
}
