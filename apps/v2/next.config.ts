import { createRequire } from "node:module";
import createMDX from "@next/mdx";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

const require = createRequire(import.meta.url);
const mdxPlugin = (name: string) => require.resolve(name);

const nextConfig: NextConfig = {
  /* config options here */
  typedRoutes: true,
  reactCompiler: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.grabbin.me" },
      { protocol: "https", hostname: "**.r2.dev" },
    ],
  },
  experimental: {
    optimizePackageImports: ["@base-ui/react", "lucide-react"],
    turbopackRustReactCompiler: true,
  },
};

const withMDX = createMDX({
  options: {
    remarkPlugins: [
      mdxPlugin("remark-gfm"),
      mdxPlugin("remark-frontmatter"),
      mdxPlugin("remark-mdx-frontmatter"),
    ],
    rehypePlugins: [
      mdxPlugin("rehype-slug"),
      [mdxPlugin("rehype-autolink-headings"), { behavior: "wrap" }],
    ],
  },
});

export default async function config() {
  await initOpenNextCloudflareForDev();
  return withMDX(nextConfig);
}
