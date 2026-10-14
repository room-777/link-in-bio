import type { PresetName } from "@grabbin/bento-layout";
import { Separator } from "@grabbin/ui/components/separator";
import type { ReactNode } from "react";

type RssWidgetLayoutProps = {
	preset: Exclude<PresetName, "fullBanner">;
	source: ReactNode;
	sourceIcon: ReactNode;
	titleArea: ReactNode;
	attribution: ReactNode;
	articleList: ReactNode;
};

export default function RssWidgetLayout({
	preset,
	source,
	sourceIcon,
	titleArea,
	attribution,
	articleList,
}: RssWidgetLayoutProps) {
	switch (preset) {
		case "halfBanner":
			return (
				<div className="flex size-full min-h-0 min-w-0 items-center gap-3 p-5">
					{source}
					{attribution}
				</div>
			);
		case "landscape":
			return (
				<div className="flex size-full min-h-0 min-w-0 gap-2 p-5">
					<div className="flex min-h-0 w-1/2 min-w-0 flex-col justify-between gap-3">
						{source}
						{attribution}
					</div>
					<Separator
						orientation="vertical"
						className="mx-2 rounded-lg bg-border/50 data-vertical:my-14 data-vertical:w-[3px]"
					/>
					<div className="flex min-h-0 w-1/2 min-w-0">{articleList}</div>
				</div>
			);
		case "squareLarge":
			return (
				<div className="flex size-full min-h-0 min-w-0 flex-col items-center gap-3 p-5">
					<div className="flex w-full flex-row items-center gap-2">
						{source}
						{attribution}
					</div>
					<Separator
						orientation="horizontal"
						className="w-6! rounded-lg bg-border/50 data-horizontal:h-[3px]"
					/>
					{articleList}
				</div>
			);
		case "portrait":
			return (
				<div className="flex size-full min-h-0 min-w-0 flex-col items-center gap-2 p-5">
					<div className="flex w-full flex-row items-center justify-between">
						{sourceIcon}
						{attribution}
					</div>
					{titleArea}
					<Separator
						orientation="horizontal"
						className="w-6! rounded-lg bg-border/50 data-horizontal:h-[3px]"
					/>
					{articleList}
				</div>
			);
		case "squareSmall":
			return (
				<div className="flex size-full min-h-0 min-w-0 flex-col justify-between gap-3 p-5">
					{source}
					{articleList}
					<div className="flex justify-end">{attribution}</div>
				</div>
			);
	}
}
