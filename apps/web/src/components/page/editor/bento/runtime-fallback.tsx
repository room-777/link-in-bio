import type { PageItemResponse } from "@grabbin/api";

export function RuntimeFallback({ item }: { item: PageItemResponse }) {
	return (
		<div className="flex size-full items-center justify-center px-4 text-center text-muted-foreground text-sm">
			Unsupported {item.type} item
		</div>
	);
}
