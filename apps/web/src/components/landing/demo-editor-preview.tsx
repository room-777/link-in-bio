"use client";

import OwnerPage from "@/components/page/owner-page";
import { DEMO_PAGE_RESPONSE } from "@/lib/demo-page";

export default function DemoEditorPreview() {
	return (
		<div
			className="relative h-full w-full [transform:translateZ(0)]"
			data-demo-preview-root
		>
			<OwnerPage pageResponse={DEMO_PAGE_RESPONSE} demoMode demoPreview />
		</div>
	);
}
