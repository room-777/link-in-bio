"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { registerBadge } from "./badge-renderer";
import { type BadgePreset, fallbackBackgrounds } from "./badge-shaders";

export function ShaderBadge({
	preset,
	tag,
	children,
}: {
	preset: BadgePreset;
	tag: string;
	children: ReactNode;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		return registerBadge(canvas, preset) ?? undefined;
	}, [preset]);

	return (
		<span className="inline-flex items-center gap-2.5 rounded-[11px] bg-black p-1 pr-3.5 text-[15px] text-white leading-none">
			<span
				className="relative isolate overflow-hidden rounded-[8px] px-2.5 py-[7px] font-semibold"
				style={{ background: fallbackBackgrounds[preset] }}
			>
				<canvas
					ref={canvasRef}
					aria-hidden="true"
					tabIndex={-1}
					className="pointer-events-none absolute inset-0 -z-10 block h-full w-full"
				/>
				<span className="[text-shadow:0_0_6px_rgb(0_0_0/0.45),0_1px_1px_rgb(0_0_0/0.25)]">
					{tag}
				</span>
			</span>
			<span className="whitespace-nowrap">{children}</span>
		</span>
	);
}
