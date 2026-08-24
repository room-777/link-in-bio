declare module "*.mdx" {
  import type { MDXContent } from "mdx/types";

  export const frontmatter: Record<string, unknown>;
  const content: MDXContent;
  export default content;
}
