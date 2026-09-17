"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

function Tabs({
	className,
	orientation = "horizontal",
	...props
}: TabsPrimitive.Root.Props) {
	return (
		<TabsPrimitive.Root
			data-slot="tabs"
			orientation={orientation}
			className={cn(
				"t-tabs group/tabs flex min-w-0 gap-2 data-horizontal:flex-col",
				className,
			)}
			{...props}
		/>
	);
}

const tabsListVariants = cva(
	"group/tabs-list relative inline-flex w-fit min-w-0 max-w-full items-center justify-center overflow-x-auto rounded-lg p-[3px] text-[var(--tabs-text-muted)] data-[variant=line]:rounded-none group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col",
	{
		variants: {
			variant: {
				default: "bg-[var(--tabs-bar-bg)]",
				line: "gap-1 bg-transparent",
			},
			size: {
				sm: "group-data-horizontal/tabs:h-8",
				default: "p-1 group-data-horizontal/tabs:h-9",
				lg: "p-1 group-data-horizontal/tabs:h-10",
				xl: "p-1 group-data-horizontal/tabs:h-12",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "sm",
		},
	},
);

function TabsList({
	className,
	variant = "default",
	size = "sm",
	children,
	...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
	return (
		<TabsPrimitive.List
			data-slot="tabs-list"
			data-variant={variant}
			data-size={size}
			className={cn(tabsListVariants({ variant, size }), className)}
			{...props}
		>
			{children}
			<TabsPrimitive.Indicator
				data-slot="tabs-indicator"
				data-variant={variant}
				className="t-tabs-pill smooth-shadow-xs pointer-events-none absolute top-0 left-0 z-0 h-[var(--active-tab-height)] w-[var(--active-tab-width)] rounded-md border border-border bg-[var(--tabs-pill-bg)] [transform:translate(var(--active-tab-left),var(--active-tab-top))] data-[variant=line]:border-0 data-[variant=line]:bg-transparent data-[variant=line]:shadow-none data-[orientation=vertical]:data-[variant=line]:after:top-0 data-[orientation=vertical]:data-[variant=line]:after:right-0 data-[orientation=vertical]:data-[variant=line]:after:bottom-auto data-[orientation=vertical]:data-[variant=line]:after:left-auto data-[orientation=vertical]:data-[variant=line]:after:h-full data-[orientation=vertical]:data-[variant=line]:after:w-0.5 data-[variant=line]:after:absolute data-[variant=line]:after:bottom-0 data-[variant=line]:after:left-0 data-[variant=line]:after:h-0.5 data-[variant=line]:after:w-full data-[variant=line]:after:bg-foreground data-[variant=line]:after:content-[''] motion-safe:transition-[transform,width,height] motion-safe:duration-[var(--tabs-dur)] motion-safe:ease-[var(--tabs-ease)] motion-reduce:transition-none dark:border-input dark:bg-input/30"
			/>
		</TabsPrimitive.List>
	);
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
	return (
		<TabsPrimitive.Tab
			data-slot="tabs-trigger"
			className={cn(
				"t-tab relative z-10 inline-flex h-[calc(100%-1px)] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent bg-transparent px-1.5 py-0.5 font-medium text-[var(--tabs-text-muted)] text-sm hover:text-foreground focus-visible:border-ring focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 aria-disabled:pointer-events-none aria-disabled:opacity-50 group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start group-data-[size=lg]/tabs-list:gap-2 group-data-[size=xl]/tabs-list:gap-2 group-data-[size=default]/tabs-list:px-2.5 group-data-[size=lg]/tabs-list:px-3 group-data-[size=xl]/tabs-list:px-4 group-data-[size=lg]/tabs-list:text-base group-data-[size=xl]/tabs-list:text-base motion-safe:transition-[border-color,box-shadow,color,opacity] motion-safe:duration-[var(--tabs-dur)] motion-safe:ease-[var(--tabs-ease)] motion-reduce:transition-none dark:hover:text-foreground [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				"group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent",
				"data-active:text-[var(--tabs-text-active)] dark:data-active:text-[var(--tabs-text-active)]",
				className,
			)}
			{...props}
		/>
	);
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
	return (
		<TabsPrimitive.Panel
			data-slot="tabs-content"
			className={cn(
				"wrap-break-word min-w-0 flex-1 text-sm outline-none",
				className,
			)}
			{...props}
		/>
	);
}

export { Tabs, TabsContent, TabsList, TabsTrigger, tabsListVariants };
