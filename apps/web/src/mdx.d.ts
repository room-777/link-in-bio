declare module "*.mdx" {
	import type { MDXContent } from "mdx/types.js";

	const content: MDXContent;
	export default content;
}
