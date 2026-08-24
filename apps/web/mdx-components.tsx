import type { MDXComponents } from "mdx/types";
import type { Route } from "next";
import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function MdxLink({ href, className, ...props }: ComponentProps<"a">) {
  if (href?.startsWith("/")) {
    return <Link href={href as Route} className={className} {...props} />;
  }

  return <a href={href} className={className} {...props} />;
}

const components = {
  a: MdxLink,
  h2: ({ className, ...props }: ComponentProps<"h2">) => (
    <h2
      className={cn(
        "text-[20px] leading-6 font-medium text-foreground",
        className,
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }: ComponentProps<"h3">) => (
    <h3
      className={cn(
        "text-[16px] leading-6 font-medium text-foreground",
        className,
      )}
      {...props}
    />
  ),
  img: ({ className, ...props }: ComponentProps<"img">) => (
    // biome-ignore lint/a11y/useAltText: Existing Markdown content supplies alt text when available.
    // biome-ignore lint/performance/noImgElement: Markdown content can use arbitrary external images.
    <img className={cn("rounded-4xl", className)} loading="lazy" {...props} />
  ),
  p: ({ className, ...props }: ComponentProps<"p">) => (
    <p
      className={cn("mt-4! mb-0! leading-6 text-muted-foreground", className)}
      {...props}
    />
  ),
} satisfies MDXComponents;

export function useMDXComponents(): MDXComponents {
  return components;
}
