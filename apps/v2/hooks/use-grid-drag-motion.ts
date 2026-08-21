import {
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import { useEffect, useRef } from "react";
import type { EventCallback } from "react-grid-layout";

type PointerPoint = { x: number; y: number };
type ScrollTarget =
  | { element: HTMLElement; rect: DOMRect }
  | { element: null; rect: { top: number; bottom: number } };

const MAX_DRAG_VELOCITY = 1400;
const VELOCITY_TO_ROTATION = 0.012;
const WIDE_ITEM_ROTATION_SCALE = 0.6;
const AUTO_SCROLL_EDGE_SIZE = 160;
const AUTO_SCROLL_MAX_SPEED = 1800;

function getPointerPoint(event: Event): PointerPoint | null {
  if ("clientX" in event && "clientY" in event) {
    const { clientX, clientY } = event as MouseEvent;
    if (typeof clientX === "number" && typeof clientY === "number") {
      return { x: clientX, y: clientY };
    }
  }

  const touch = (event as TouchEvent).touches?.[0];
  return touch ? { x: touch.clientX, y: touch.clientY } : null;
}

function getScrollTarget(element: HTMLElement | null): ScrollTarget {
  let current = element?.parentElement ?? null;
  while (current) {
    const style = window.getComputedStyle(current);
    const canScrollVertically =
      /(auto|scroll|overlay)/.test(style.overflowY) &&
      current.scrollHeight > current.clientHeight;
    if (canScrollVertically) {
      return { element: current, rect: current.getBoundingClientRect() };
    }
    current = current.parentElement;
  }

  return {
    element: null,
    rect: { top: 0, bottom: window.innerHeight },
  };
}

function getAutoScrollSpeed(pointerY: number, target: ScrollTarget) {
  const distanceFromTop = pointerY - target.rect.top;
  if (distanceFromTop >= 0 && distanceFromTop < AUTO_SCROLL_EDGE_SIZE) {
    const progress = 1 - distanceFromTop / AUTO_SCROLL_EDGE_SIZE;
    return -AUTO_SCROLL_MAX_SPEED * Math.sqrt(progress);
  }

  const distanceFromBottom = target.rect.bottom - pointerY;
  if (distanceFromBottom >= 0 && distanceFromBottom < AUTO_SCROLL_EDGE_SIZE) {
    const progress = 1 - distanceFromBottom / AUTO_SCROLL_EDGE_SIZE;
    return AUTO_SCROLL_MAX_SPEED * Math.sqrt(progress);
  }

  return 0;
}

function scrollTarget(target: ScrollTarget, step: number) {
  if (step === 0) return;
  if (target.element) {
    target.element.scrollTop += step;
    return;
  }
  window.scrollBy({ top: step, behavior: "auto" });
}

function syncDragPosition(pointer: PointerPoint) {
  // ponytail: RGL's react-draggable only advances on document mousemove events.
  document.dispatchEvent(
    new MouseEvent("mousemove", {
      bubbles: true,
      buttons: 1,
      clientX: pointer.x,
      clientY: pointer.y,
    }),
  );
}

function getDragRotationScale(element: HTMLElement | null) {
  return element?.querySelector('[data-grid-item-type="section"]')
    ? WIDE_ITEM_ROTATION_SCALE
    : 1;
}

function setDragRotation(
  element: HTMLElement | null,
  rotation: { x: string; z: string },
) {
  if (!element) return;

  const scale = getDragRotationScale(element);
  element.style.setProperty(
    "--grid-drag-rotate-x",
    `${Number.parseFloat(rotation.x) * scale}deg`,
  );
  element.style.setProperty(
    "--grid-drag-rotate-z",
    `${Number.parseFloat(rotation.z) * scale}deg`,
  );
}

function resetDragRotation(element: HTMLElement | null) {
  setDragRotation(element, { x: "0deg", z: "0deg" });
}

export function useGridDragMotion() {
  const shouldReduceMotion = useReducedMotion();
  const draggingElementRef = useRef<HTMLElement | null>(null);
  const autoScrollTargetRef = useRef<ScrollTarget | null>(null);
  const autoScrollPointerRef = useRef<PointerPoint | null>(null);
  const autoScrollFrameRef = useRef<number | null>(null);
  const autoScrollLastTimeRef = useRef<number | null>(null);
  const pendingRotationRef = useRef({ x: "0deg", z: "0deg" });
  const rotationFrameRef = useRef<number | null>(null);
  const dragPointerX = useMotionValue(0);
  const dragPointerY = useMotionValue(0);
  const dragVelocityX = useVelocity(dragPointerX);
  const dragVelocityY = useVelocity(dragPointerY);
  const dragRotateX = useTransform(
    dragVelocityY,
    [-MAX_DRAG_VELOCITY, 0, MAX_DRAG_VELOCITY],
    [
      `${MAX_DRAG_VELOCITY * VELOCITY_TO_ROTATION}deg`,
      "0deg",
      `${-MAX_DRAG_VELOCITY * VELOCITY_TO_ROTATION}deg`,
    ],
  );
  const dragRotateZ = useTransform(
    dragVelocityX,
    [-MAX_DRAG_VELOCITY, 0, MAX_DRAG_VELOCITY],
    [
      `${-MAX_DRAG_VELOCITY * VELOCITY_TO_ROTATION}deg`,
      "0deg",
      `${MAX_DRAG_VELOCITY * VELOCITY_TO_ROTATION}deg`,
    ],
  );
  const smoothDragRotateX = useSpring(dragRotateX, {
    stiffness: 500,
    damping: 35,
    mass: 0.25,
  });
  const smoothDragRotateZ = useSpring(dragRotateZ, {
    stiffness: 500,
    damping: 35,
    mass: 0.25,
  });

  const cancelRotationFrame = () => {
    if (rotationFrameRef.current === null) return;
    window.cancelAnimationFrame(rotationFrameRef.current);
    rotationFrameRef.current = null;
  };

  const scheduleRotation = (axis: "x" | "z", value: string) => {
    pendingRotationRef.current[axis] = value;
    if (rotationFrameRef.current !== null) return;

    rotationFrameRef.current = window.requestAnimationFrame(() => {
      rotationFrameRef.current = null;
      setDragRotation(draggingElementRef.current, pendingRotationRef.current);
    });
  };

  const cancelAutoScrollFrame = () => {
    if (autoScrollFrameRef.current === null) return;
    window.cancelAnimationFrame(autoScrollFrameRef.current);
    autoScrollFrameRef.current = null;
  };

  const runAutoScroll = () => {
    autoScrollFrameRef.current = window.requestAnimationFrame((time) => {
      autoScrollFrameRef.current = null;
      const pointer = autoScrollPointerRef.current;
      const target = autoScrollTargetRef.current;
      if (!pointer || !target) return;

      if (target.element) {
        target.rect = target.element.getBoundingClientRect();
      }
      const elapsed = Math.min(
        autoScrollLastTimeRef.current === null
          ? 16.67
          : time - autoScrollLastTimeRef.current,
        50,
      );
      autoScrollLastTimeRef.current = time;
      const step = (getAutoScrollSpeed(pointer.y, target) * elapsed) / 1000;
      runAutoScroll();
      if (step !== 0) {
        scrollTarget(target, step);
        syncDragPosition(pointer);
      }
    });
  };

  const stopAutoScroll = () => {
    cancelAutoScrollFrame();
    autoScrollTargetRef.current = null;
    autoScrollPointerRef.current = null;
    autoScrollLastTimeRef.current = null;
  };

  useMotionValueEvent(smoothDragRotateX, "change", (value) => {
    if (shouldReduceMotion) return;
    scheduleRotation("x", value);
  });
  useMotionValueEvent(smoothDragRotateZ, "change", (value) => {
    if (shouldReduceMotion) return;
    scheduleRotation("z", value);
  });

  useEffect(() => {
    return () => {
      if (rotationFrameRef.current !== null) {
        window.cancelAnimationFrame(rotationFrameRef.current);
      }
      if (autoScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(autoScrollFrameRef.current);
      }
    };
  }, []);

  const onDragStart: EventCallback = (
    _currentLayout,
    _oldItem,
    _newItem,
    _placeholder,
    event,
    element,
  ) => {
    draggingElementRef.current = element;
    autoScrollTargetRef.current = getScrollTarget(element);
    autoScrollPointerRef.current = getPointerPoint(event);
    autoScrollLastTimeRef.current = null;
    cancelAutoScrollFrame();
    runAutoScroll();
    cancelRotationFrame();
    pendingRotationRef.current = { x: "0deg", z: "0deg" };
    resetDragRotation(element);
    if (shouldReduceMotion) return;
    const point = getPointerPoint(event);
    if (!point) return;
    dragPointerX.set(point.x);
    dragPointerY.set(point.y);
  };

  const onDrag: EventCallback = (
    _currentLayout,
    _oldItem,
    _newItem,
    _placeholder,
    event,
    element,
  ) => {
    const point = getPointerPoint(event);
    if (point) autoScrollPointerRef.current = point;
    if (shouldReduceMotion) return;
    if (!point) return;
    if (autoScrollFrameRef.current === null) runAutoScroll();
    draggingElementRef.current = element ?? draggingElementRef.current;
    dragPointerX.set(point.x);
    dragPointerY.set(point.y);
  };

  const onDragStop: EventCallback = (
    _currentLayout,
    _oldItem,
    _newItem,
    _placeholder,
    _event,
    element,
  ) => {
    stopAutoScroll();
    cancelRotationFrame();
    resetDragRotation(element ?? draggingElementRef.current);
    draggingElementRef.current = null;
  };

  return { onDragStart, onDrag, onDragStop };
}
