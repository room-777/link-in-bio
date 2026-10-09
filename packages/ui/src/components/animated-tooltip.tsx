"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import { cn } from "cn";
import { Fragment, type ReactElement, type ReactNode } from "react";

export type AnimatedTooltipControl =
	| { id: string; trigger: ReactElement; content: ReactNode }
	| { id: string; element: ReactElement };

export function AnimatedTooltip({
	controls,
	className,
}: {
	controls: AnimatedTooltipControl[];
	className?: string;
}) {
	const handle = Tooltip.createHandle<ReactNode>();

	return (
		<Tooltip.Provider delay={50} closeDelay={50} timeout={50}>
			{controls.map((control) =>
				"element" in control ? (
					<Fragment key={control.id}>{control.element}</Fragment>
				) : (
					<Tooltip.Trigger
						key={control.id}
						handle={handle}
						payload={control.content}
						render={control.trigger}
					/>
				),
			)}
			<Tooltip.Root handle={handle}>
				{({ payload }) => (
					<Tooltip.Portal>
						<Tooltip.Positioner
							sideOffset={8}
							className="h-[var(--positioner-height)] w-[var(--positioner-width)] transition-[top,left,right,bottom] duration-200"
						>
							<Tooltip.Popup
								className={cn(
									"smooth-shadow-ring-xl smooth-ring-neutral-200/10 inline-flex w-fit max-w-xs items-center rounded-sm px-3 py-1.5 text-foreground text-xs transition-[width,height,opacity,transform] duration-200",
									className,
								)}
							>
								<Tooltip.Viewport className="overflow-clip data-[activation-direction~=left]:[&_[data-current][data-starting-style]]:-translate-x-1/2 data-[activation-direction~=right]:[&_[data-current][data-starting-style]]:translate-x-1/2 data-[activation-direction~=left]:[&_[data-previous][data-ending-style]]:translate-x-1/2 data-[activation-direction~=right]:[&_[data-previous][data-ending-style]]:-translate-x-1/2 data-[activation-direction~=left]:[&_[data-previous][data-ending-style]]:opacity-0 data-[activation-direction~=right]:[&_[data-previous][data-ending-style]]:opacity-0">
									{payload}
								</Tooltip.Viewport>
							</Tooltip.Popup>
						</Tooltip.Positioner>
					</Tooltip.Portal>
				)}
			</Tooltip.Root>
		</Tooltip.Provider>
	);
}
