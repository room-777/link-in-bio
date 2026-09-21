import type { PageItemLinkPresentation, PageItemResponse } from "@grabbin/api";
import type { PresetName } from "@grabbin/bento-layout";
import { Button } from "@grabbin/ui/components/button";
import { TriangleIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
	type CSSProperties,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";

function LinkAction({
	href,
	label,
	detail,
	icon,
	actionBackground,
	actionText,
	actionVariant,
	className: extraClassName,
}: {
	href: string;
	label: string;
	detail?: string;
	icon?: ReactNode;
	actionBackground?: string;
	actionText?: string;
	actionVariant?: "solid" | "outline";
	className?: string;
}) {
	const hasTheme = Boolean(actionBackground && actionText);
	const className = `cursor-pointer! self-start shrink-0 rounded-md px-3 text-sm! h-8 gap-1 shadow-none transition-all duration-150 ease-in-out focus-visible:ring-ring/30 ${
		!hasTheme ? "border border-border bg-[#f6f8fa] hover:bg-[#f6f8fa]/80" : ""
	} ${extraClassName ?? ""}`;
	return (
		<Button
			render={
				<a
					href={href}
					target="_blank"
					rel="noreferrer"
					aria-label={detail ? [label, detail].join(" ") : label}
					className="font-medium"
				>
					{icon ? (
						<span
							aria-hidden="true"
							className="inline-flex size-3 shrink-0 items-center justify-center"
						>
							{icon}
						</span>
					) : null}
					<span>{label}</span>
					{detail ? (
						<span
							className={
								hasTheme ? "ml-1 opacity-70" : "ml-1 text-muted-foreground"
							}
						>
							{detail}
						</span>
					) : null}
				</a>
			}
			nativeButton={false}
			variant={
				actionVariant === "outline"
					? "outline"
					: hasTheme
						? "default"
						: "secondary"
			}
			size="sm"
			style={{
				...(hasTheme
					? {
							backgroundColor: actionBackground,
							color: actionText,
						}
					: {}),
				boxShadow: "none",
			}}
			className={className}
		/>
	);
}

type GithubContributionGraphData = {
	totalContributions: number;
	weeks: Array<{
		days: Array<{
			count: number;
			level: number;
			color: string;
		}>;
	}>;
};

function parseGithubContributionGraph(
	value: unknown,
): GithubContributionGraphData | undefined {
	if (typeof value !== "string") return undefined;
	try {
		const parsed = JSON.parse(value) as GithubContributionGraphData;
		return parsed && Array.isArray(parsed.weeks) ? parsed : undefined;
	} catch {
		return undefined;
	}
}

const githubGraphWeekCount = {
	landscape: 16,
	portrait: 12,
	squareLarge: 26,
} as const;

function GithubContributionGraph({
	data,
	preset,
}: {
	data: GithubContributionGraphData;
	preset: "landscape" | "portrait" | "squareLarge";
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [size, setSize] = useState({ width: 0, height: 0 });
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		const updateSize = () =>
			setSize({ width: container.clientWidth, height: container.clientHeight });
		updateSize();
		const observer = new ResizeObserver(updateSize);
		observer.observe(container);
		return () => observer.disconnect();
	}, []);

	const gap = 8;
	const availableCellHeight = (size.height - gap * 6) / 7;
	const fittingWeekCount =
		availableCellHeight > 0
			? Math.floor((size.width + gap) / (availableCellHeight + gap))
			: 0;
	const weekCount = Math.min(
		githubGraphWeekCount[preset],
		data.weeks.length,
		Math.max(0, fittingWeekCount),
	);
	const weeks = data.weeks.slice(-weekCount);
	const cellSize =
		weekCount > 0 && size.height > 0
			? Math.min(
					(size.width - gap * (weekCount - 1)) / weekCount,
					availableCellHeight,
				)
			: 0;
	const cells = weeks.flatMap((week, weekIndex) =>
		Array.from({ length: 7 }, (_, dayIndex) => ({
			day: week.days[dayIndex],
			key: `${weekIndex}-${dayIndex}`,
		})),
	);

	return (
		<div
			role="img"
			aria-label="GitHub contribution graph"
			className="size-full min-h-0 min-w-0 overflow-hidden rounded-lg p-1"
		>
			<div
				ref={containerRef}
				className="flex size-full min-h-0 min-w-0 items-center justify-center"
			>
				<div
					className="grid"
					style={{
						gridTemplateColumns: `repeat(${weeks.length}, ${cellSize}px)`,
						gridTemplateRows: `repeat(7, ${cellSize}px)`,
						gridAutoFlow: "column",
						gap,
					}}
				>
					{cells.map(({ day, key }) => (
						<span
							key={key}
							aria-hidden="true"
							className="size-full min-w-0 rounded-xs"
							style={{ backgroundColor: day?.color ?? "transparent" }}
						/>
					))}
				</div>
			</div>
		</div>
	);
}

function LinkPreview({
	imageUrls,
	backgroundColor,
}: {
	imageUrls: readonly string[];
	backgroundColor?: string;
}) {
	if (imageUrls.length > 1) {
		return (
			<div className="grid size-full grid-cols-2 gap-2">
				{imageUrls.map((imageUrl) => (
					<div
						key={imageUrl}
						className="min-h-0 min-w-0 overflow-hidden rounded-md bg-muted/30"
					>
						<img src={imageUrl} alt="" className="size-full object-cover" />
					</div>
				))}
			</div>
		);
	}
	const imageUrl = imageUrls[0];
	return imageUrl ? (
		<img src={imageUrl} alt="" className="size-full object-cover" />
	) : (
		<div
			className="flex size-full items-center justify-center px-4 text-center font-semibold text-lg tracking-tight"
			style={{ backgroundColor }}
		/>
	);
}

function LinkBadge({
	item,
	presentation,
}: {
	item: Extract<PageItemResponse, { type: "link" }>;
	presentation?: PageItemLinkPresentation;
}) {
	const faviconUrl = item.data.metadata?.faviconUrl;
	const providerLabel = presentation?.providerLabel ?? "Link";
	return faviconUrl ? (
		<a
			href={item.data.url}
			target="_blank"
			rel="noreferrer"
			aria-label={`Open ${providerLabel}`}
			className="inline-flex size-8 shrink-0 cursor-pointer! items-center justify-center rounded-md bg-muted/30 p-0.5 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
		>
			<img src={faviconUrl} alt="" className="size-full object-contain" />
		</a>
	) : (
		<a
			href={item.data.url}
			target="_blank"
			rel="noreferrer"
			aria-label={`Open ${providerLabel}`}
			className="inline-flex size-11 shrink-0 cursor-pointer! items-center justify-center rounded-2xl px-2 text-center font-semibold text-xs transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
			style={
				presentation
					? { backgroundColor: presentation.cardBackground }
					: undefined
			}
		>
			<span className="sr-only">Open {providerLabel}</span>
		</a>
	);
}

function LinkTitle({ title, preset }: { title: string; preset: PresetName }) {
	const isHalfBanner = preset === "halfBanner";
	const isLandscape = preset === "landscape";
	const isSquareSmall = preset === "squareSmall";
	const isTall = preset === "squareLarge" || preset === "portrait";
	return (
		<div
			className={`field-sizing-fixed wrap-break-word block min-h-0 w-full min-w-24 max-w-full rounded-sm px-1 py-0 font-medium text-foreground text-sm ${
				isHalfBanner
					? "h-8 max-h-8 overflow-hidden whitespace-nowrap leading-8"
					: isTall
						? "h-20 max-h-20 leading-5"
						: "max-h-full leading-5"
			} ${isLandscape || isSquareSmall || isTall ? "no-scrollbar flex-1 overflow-y-auto whitespace-pre-line" : "truncate"}`}
		>
			{title}
		</div>
	);
}

export function LinkItem({
	item,
	preset,
}: {
	item: Extract<PageItemResponse, { type: "link" }>;
	preset: PresetName;
}) {
	const metadata = item.data.metadata;
	const presentation = metadata?.presentation;
	const title = metadata?.title?.trim() ?? item.data.url;
	const linkCardClassName = presentation?.cardBackground
		? "link-card-themed"
		: "";
	const linkCardStyle = presentation?.cardBackground
		? ({
				backgroundColor: presentation.cardBackground,
				"--link-card-background": presentation.cardBackground,
			} as CSSProperties)
		: undefined;
	const imageUrls =
		presentation?.imageUrls ?? (metadata?.imageUrl ? [metadata.imageUrl] : []);
	const githubGraph = parseGithubContributionGraph(
		presentation?.githubContributionGraph,
	);
	const isGithubGraphPreset =
		(preset === "landscape" ||
			preset === "portrait" ||
			preset === "squareLarge") &&
		Boolean(githubGraph);
	const shouldShowLinkAction = Boolean(presentation?.actionLabel);
	const isProductHuntUpvote = presentation?.actionIcon === "upvote";
	const linkActionProps = {
		label: presentation?.actionLabel ?? "Open",
		detail: presentation?.actionDetail,
		icon: isProductHuntUpvote ? (
			<TriangleIcon className="size-3 fill-current" />
		) : undefined,
		actionBackground: presentation?.actionBackground,
		actionText: presentation?.actionText,
		actionVariant: presentation?.actionVariant,
	};
	const isLandscape = preset === "landscape";
	const isTall = preset === "squareLarge" || preset === "portrait";
	const content = (
		<div
			className={`flex min-h-0 min-w-0 flex-col items-start gap-2 ${
				isLandscape
					? "h-full flex-4 items-stretch justify-between"
					: isTall
						? "flex-3 items-stretch justify-between"
						: ""
			} ${linkCardClassName}`}
			style={linkCardStyle}
		>
			<div
				className={`flex min-h-0 min-w-0 flex-col items-start gap-1 ${
					isLandscape ? "w-full flex-1" : isTall ? "flex-1 items-stretch" : ""
				}`}
			>
				<LinkBadge item={item} presentation={presentation} />
				<LinkTitle title={title} preset={preset} />
			</div>
			{shouldShowLinkAction ? (
				<LinkAction href={item.data.url} {...linkActionProps} />
			) : null}
		</div>
	);

	const renderPreset = () => {
		if (preset === "squareSmall") {
			return (
				<div
					className={`flex size-full min-h-0 flex-col items-start justify-between gap-2 p-4 ${linkCardClassName}`}
					style={linkCardStyle}
				>
					<div className="flex min-h-0 w-full flex-1 flex-col gap-1">
						<LinkBadge item={item} presentation={presentation} />
						<div className="flex min-h-0 min-w-0 flex-1 flex-col">
							<LinkTitle title={title} preset={preset} />
						</div>
					</div>
					{shouldShowLinkAction ? (
						<LinkAction href={item.data.url} {...linkActionProps} />
					) : null}
				</div>
			);
		}

		if (preset === "halfBanner") {
			return (
				<div
					className={`flex size-full min-h-0 items-center justify-between gap-1 p-4 ${linkCardClassName}`}
					style={linkCardStyle}
				>
					<div className="flex min-w-0 flex-1 items-center gap-1">
						<LinkBadge item={item} presentation={presentation} />
						<div className="min-h-0 min-w-0 flex-1">
							<LinkTitle title={title} preset={preset} />
						</div>
					</div>
					{shouldShowLinkAction ? (
						<LinkAction
							href={item.data.url}
							{...linkActionProps}
							className="h-8 self-center"
						/>
					) : null}
				</div>
			);
		}

		return (
			<div
				className={`flex size-full min-h-0 min-w-0 gap-3 p-4 ${
					isLandscape ? "flex-row-reverse items-stretch" : "flex-col"
				} ${linkCardClassName}`}
				style={linkCardStyle}
			>
				{isLandscape && isGithubGraphPreset && githubGraph ? (
					<div className="relative min-h-0 min-w-0 flex-4 overflow-hidden rounded-lg">
						<GithubContributionGraph data={githubGraph} preset="landscape" />
					</div>
				) : isLandscape && imageUrls.length > 0 ? (
					<div className="relative min-h-0 min-w-0 flex-4 overflow-hidden rounded-lg bg-muted/30">
						<LinkPreview
							imageUrls={imageUrls}
							backgroundColor={presentation?.cardBackground}
						/>
					</div>
				) : null}
				{content}
				{!isLandscape && isGithubGraphPreset && githubGraph ? (
					<div className="relative min-h-0 flex-3 overflow-hidden rounded-lg">
						<GithubContributionGraph
							data={githubGraph}
							preset={preset as "portrait" | "squareLarge"}
						/>
					</div>
				) : !isLandscape && imageUrls.length > 0 ? (
					<div className="relative min-h-0 flex-3 overflow-hidden rounded-lg bg-muted/30">
						<LinkPreview
							imageUrls={imageUrls}
							backgroundColor={presentation?.cardBackground}
						/>
					</div>
				) : null}
			</div>
		);
	};

	return (
		<AnimatePresence initial={false} mode="popLayout">
			<motion.div
				key={preset}
				initial={{ opacity: 0, filter: "blur(2px)" }}
				animate={{ opacity: 1, filter: "blur(0px)" }}
				exit={{ opacity: 0, filter: "blur(2px)" }}
				transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
				className="size-full min-h-0 min-w-0"
			>
				{renderPreset()}
			</motion.div>
		</AnimatePresence>
	);
}
