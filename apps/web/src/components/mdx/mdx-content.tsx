import type { MDXContent as MDXContentType } from "mdx/types.js";
import { mdxComponents } from "./mdx-components";

export default function MdxContent({ Content }: { Content: MDXContentType }) {
	return <Content components={mdxComponents} />;
}
