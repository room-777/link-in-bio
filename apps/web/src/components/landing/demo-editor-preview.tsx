"use client";

import { DEMO_PAGE_RESPONSE } from "@/lib/demo-page";
import OwnerPage from "../page/editor/owner-page";

export default function DemoEditorPreview() {
	return (
		<div
			className="relative h-full w-full overflow-hidden [transform:translateZ(0)]"
			data-demo-preview-root
		>
			<OwnerPage pageResponse={DEMO_PAGE_RESPONSE} demoMode demoPreview />
		</div>
	);
}
