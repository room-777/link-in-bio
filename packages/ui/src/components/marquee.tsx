"use client";

import { cn } from "@grabbin/ui/lib/utils";
import React from "react";

interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
	duration?: number;
	pauseOnHover?: boolean;
	direction?: "left" | "right" | "up" | "down";
	fade?: boolean;
	fadeAmount?: number;
}

export function Marquee({
	children,
	className,
	duration = 20,
	pauseOnHover = false,
	direction = "left",
	fade = true,
	fadeAmount = 10,
	...props
}: MarqueeProps) {
	const items = React.Children.toArray(children);
	const isVertical = direction === "up" || direction === "down";
	const midpoint = Math.ceil(items.length / 2);
	const rows = [items.slice(0, midpoint), items.slice(midpoint)];

	return (
		<>
			<style>
				{`
        @keyframes scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        @keyframes scroll-reverse {
          from {
            transform: translateX(-50%);
          }
          to {
            transform: translateX(0);
          }
        }

        @keyframes scroll-y {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(-50%);
          }
        }

        @keyframes scroll-y-reverse {
          from {
            transform: translateY(-50%);
          }
          to {
            transform: translateY(0);
          }
        }

        .marquee-scroller {
          display: flex;
        }

        .marquee-scroller.pause-on-hover:hover {
          animation-play-state: paused;
        }
      `}
			</style>
			<div
				className={cn(
					"flex w-full gap-2 overflow-hidden",
					isVertical ? "h-full flex-row" : "flex-col",
					className,
				)}
				style={{
					...(fade && {
						maskImage: isVertical
							? `linear-gradient(to bottom, transparent 0%, black ${fadeAmount}%, black ${
									100 - fadeAmount
								}%, transparent 100%)`
							: `linear-gradient(to right, transparent 0%, black ${fadeAmount}%, black ${
									100 - fadeAmount
								}%, transparent 100%)`,
						WebkitMaskImage: isVertical
							? `linear-gradient(to bottom, transparent 0%, black ${fadeAmount}%, black ${
									100 - fadeAmount
								}%, transparent 100%)`
							: `linear-gradient(to right, transparent 0%, black ${fadeAmount}%, black ${
									100 - fadeAmount
								}%, transparent 100%)`,
					}),
				}}
				{...props}
			>
				{rows.map((rowItems, rowIndex) => {
					const rowDirection =
						isVertical || rowIndex === 0
							? direction
							: direction === "left"
								? "right"
								: "left";
					const animationName = isVertical
						? direction === "up"
							? "scroll-y"
							: "scroll-y-reverse"
						: rowDirection === "left"
							? "scroll"
							: "scroll-reverse";

					return (
						<div
							key={`row-${rowIndex}`}
							className={cn(
								"flex overflow-hidden",
								isVertical ? "min-h-0 flex-1 flex-col" : "w-full",
							)}
						>
							<div
								className={cn(
									"marquee-scroller flex shrink-0",
									isVertical ? "flex-col" : "w-max",
									pauseOnHover && "pause-on-hover",
								)}
								style={{
									animation: `${animationName} ${duration}s linear infinite`,
								}}
							>
								{[...rowItems, ...rowItems].map((item, index) => (
									<div
										key={`${rowIndex}-${index}`}
										className={cn("flex shrink-0", isVertical && "w-full")}
									>
										{item}
									</div>
								))}
							</div>
						</div>
					);
				})}
			</div>
		</>
	);
}
