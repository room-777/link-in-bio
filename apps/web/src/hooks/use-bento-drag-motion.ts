"use client";

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
	| { element: HTMLElement; rect: DOMRect; maxScrollTop: number }
	| {
			element: null;
			rect: { top: number; bottom: number };
			maxScrollTop: number;
	  };

const MAX_DRAG_VELOCITY = 1400;
const VELOCITY_TO_ROTATION = 0.012;
const SECTION_ROTATION_SCALE = 0.6;
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
		if (
			/(auto|scroll|overlay)/.test(style.overflowY) &&
			current.scrollHeight > current.clientHeight
		) {
			return {
				element: current,
				rect: current.getBoundingClientRect(),
				maxScrollTop: current.scrollHeight - current.clientHeight,
			};
		}
		current = current.parentElement;
	}

	const scrollingElement = document.scrollingElement;
	return {
		element: null,
		rect: { top: 0, bottom: window.innerHeight },
		maxScrollTop: scrollingElement
			? Math.max(
					0,
					scrollingElement.scrollHeight - scrollingElement.clientHeight,
				)
			: Math.max(0, window.scrollY),
	};
}

function getAutoScrollSpeed(pointerY: number, target: ScrollTarget) {
	const distanceFromTop = pointerY - target.rect.top;
	if (distanceFromTop >= 0 && distanceFromTop < AUTO_SCROLL_EDGE_SIZE) {
		return (
			-AUTO_SCROLL_MAX_SPEED *
			Math.sqrt(1 - distanceFromTop / AUTO_SCROLL_EDGE_SIZE)
		);
	}

	const distanceFromBottom = target.rect.bottom - pointerY;
	if (distanceFromBottom >= 0 && distanceFromBottom < AUTO_SCROLL_EDGE_SIZE) {
		return (
			AUTO_SCROLL_MAX_SPEED *
			Math.sqrt(1 - distanceFromBottom / AUTO_SCROLL_EDGE_SIZE)
		);
	}

	return 0;
}

function syncDragPosition(pointer: PointerPoint) {
	// ponytail: RGL only advances on document mousemove events.
	document.dispatchEvent(
		new MouseEvent("mousemove", {
			bubbles: true,
			buttons: 1,
			clientX: pointer.x,
			clientY: pointer.y,
		}),
	);
}

function setDragRotation(
	element: HTMLElement | null,
	rotation: { x: string; z: string },
) {
	if (!element) return;
	const scale = element.querySelector('[data-bento-item-type="section"]')
		? SECTION_ROTATION_SCALE
		: 1;
	element.style.setProperty(
		"--bento-drag-rotate-x",
		`${Number.parseFloat(rotation.x) * scale}deg`,
	);
	element.style.setProperty(
		"--bento-drag-rotate-z",
		`${Number.parseFloat(rotation.z) * scale}deg`,
	);
}

export function useBentoDragMotion() {
	const shouldReduceMotion = useReducedMotion();
	const draggingElementRef = useRef<HTMLElement | null>(null);
	const autoScrollTargetRef = useRef<ScrollTarget | null>(null);
	const autoScrollPointerRef = useRef<PointerPoint | null>(null);
	const autoScrollFrameRef = useRef<number | null>(null);
	const autoScrollLastTimeRef = useRef<number | null>(null);
	const rotationFrameRef = useRef<number | null>(null);
	const pendingRotationRef = useRef({ x: "0deg", z: "0deg" });
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

	const cancelAutoScroll = () => {
		if (autoScrollFrameRef.current !== null) {
			window.cancelAnimationFrame(autoScrollFrameRef.current);
			autoScrollFrameRef.current = null;
		}
	};
	const runAutoScroll = () => {
		autoScrollFrameRef.current = window.requestAnimationFrame((time) => {
			autoScrollFrameRef.current = null;
			const pointer = autoScrollPointerRef.current;
			const target = autoScrollTargetRef.current;
			if (!pointer || !target) return;
			if (target.element) target.rect = target.element.getBoundingClientRect();
			const elapsed = Math.min(
				autoScrollLastTimeRef.current === null
					? 16.67
					: time - autoScrollLastTimeRef.current,
				50,
			);
			autoScrollLastTimeRef.current = time;
			const step = (getAutoScrollSpeed(pointer.y, target) * elapsed) / 1000;
			if (step === 0) return;
			const currentScrollTop = target.element
				? target.element.scrollTop
				: window.scrollY;
			const nextScrollTop = Math.min(
				target.maxScrollTop,
				Math.max(0, currentScrollTop + step),
			);
			if (nextScrollTop === currentScrollTop) return;
			if (target.element) target.element.scrollTop = nextScrollTop;
			else window.scrollTo({ top: nextScrollTop, behavior: "auto" });
			syncDragPosition(pointer);
			runAutoScroll();
		});
	};
	const stopAutoScroll = () => {
		cancelAutoScroll();
		autoScrollTargetRef.current = null;
		autoScrollPointerRef.current = null;
		autoScrollLastTimeRef.current = null;
	};

	useMotionValueEvent(smoothDragRotateX, "change", (value) => {
		if (!shouldReduceMotion) scheduleRotation("x", value);
	});
	useMotionValueEvent(smoothDragRotateZ, "change", (value) => {
		if (!shouldReduceMotion) scheduleRotation("z", value);
	});

	useEffect(
		() => () => {
			if (rotationFrameRef.current !== null) {
				window.cancelAnimationFrame(rotationFrameRef.current);
			}
			if (autoScrollFrameRef.current !== null) {
				window.cancelAnimationFrame(autoScrollFrameRef.current);
			}
		},
		[],
	);

	const onDragStart: EventCallback = (
		_currentLayout,
		_oldItem,
		_newItem,
		_placeholder,
		event,
		element,
	) => {
		draggingElementRef.current = element;
		const point = getPointerPoint(event);
		autoScrollTargetRef.current = getScrollTarget(element);
		autoScrollPointerRef.current = point;
		autoScrollLastTimeRef.current = null;
		cancelAutoScroll();
		cancelRotationFrame();
		pendingRotationRef.current = { x: "0deg", z: "0deg" };
		setDragRotation(element, pendingRotationRef.current);
		if (!shouldReduceMotion && point) {
			dragPointerX.set(point.x);
			dragPointerY.set(point.y);
		}
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
		const previousPoint = autoScrollPointerRef.current;
		const target = autoScrollTargetRef.current;
		if (point) {
			autoScrollPointerRef.current = point;
			const movingTowardTop =
				target &&
				previousPoint &&
				point.y < previousPoint.y &&
				point.y - target.rect.top < AUTO_SCROLL_EDGE_SIZE;
			const movingTowardBottom =
				target &&
				previousPoint &&
				point.y > previousPoint.y &&
				target.rect.bottom - point.y < AUTO_SCROLL_EDGE_SIZE;
			if (
				target &&
				autoScrollFrameRef.current === null &&
				(movingTowardTop || movingTowardBottom)
			) {
				runAutoScroll();
			}
		}
		if (shouldReduceMotion || !point) return;
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
		setDragRotation(element ?? draggingElementRef.current, {
			x: "0deg",
			z: "0deg",
		});
		draggingElementRef.current = null;
	};

	return { onDragStart, onDrag, onDragStop };
}
