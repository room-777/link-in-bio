import { cn } from "@grabbin/ui/lib/utils";
import type { MDXComponents } from "mdx/types.js";
import type { ComponentProps } from "react";

export const mdxComponents = {
	h1: (props: ComponentProps<"h1">) => (
		<h1
			{...props}
			className={cn(
				"font-medium text-3xl text-primary tracking-tight",
				props.className,
			)}
		/>
	),
	h2: (props: ComponentProps<"h2">) => (
		<h2
			{...props}
			className={cn(
				"mt-10 font-medium text-2xl text-primary tracking-tight",
				props.className,
			)}
		/>
	),
	h3: (props: ComponentProps<"h3">) => (
		<h3
			{...props}
			className={cn(
				"mt-8 font-medium text-primary text-xl tracking-tight",
				props.className,
			)}
		/>
	),
	h4: (props: ComponentProps<"h4">) => (
		<h4
			{...props}
			className={cn("mt-6 font-medium text-lg text-primary", props.className)}
		/>
	),
	h5: (props: ComponentProps<"h5">) => (
		<h5 {...props} className={cn("text-primary", props.className)} />
	),
	h6: (props: ComponentProps<"h6">) => (
		<h6 {...props} className={cn("text-primary", props.className)} />
	),
	p: (props: ComponentProps<"p">) => (
		<p {...props} className={cn("mt-4 leading-7", props.className)} />
	),
	a: (props: ComponentProps<"a">) => (
		<a
			{...props}
			className={cn("text-brand underline underline-offset-4", props.className)}
		/>
	),
	ul: (props: ComponentProps<"ul">) => (
		<ul
			{...props}
			className={cn("my-4 list-disc space-y-2 pl-6", props.className)}
		/>
	),
	ol: (props: ComponentProps<"ol">) => (
		<ol
			{...props}
			className={cn("my-4 list-decimal space-y-2 pl-6", props.className)}
		/>
	),
	blockquote: (props: ComponentProps<"blockquote">) => (
		<blockquote
			{...props}
			className={cn(
				"my-6 border-l-2 pl-4 text-muted-foreground",
				props.className,
			)}
		/>
	),
	pre: (props: ComponentProps<"pre">) => (
		<pre
			{...props}
			className={cn(
				"my-6 overflow-x-auto rounded-lg bg-muted p-4",
				props.className,
			)}
		/>
	),
	code: (props: ComponentProps<"code">) => (
		<code {...props} className={cn("font-mono text-sm", props.className)} />
	),
} satisfies MDXComponents;
