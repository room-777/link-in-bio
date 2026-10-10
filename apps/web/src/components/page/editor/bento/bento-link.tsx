import type { PageItemLinkPresentation, PageItemResponse } from "@grabbin/api";
import type { PresetName } from "@grabbin/bento-layout";
import { Button, buttonVariants } from "@grabbin/ui/components/button";
import { Textarea } from "@grabbin/ui/components/textarea";
import { cn } from "@grabbin/ui/lib/utils";
import { CircleFadingArrowUp, TriangleIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
	type CSSProperties,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";
import { Like2 } from "reicon-react/icons/Like2";
import { Trash } from "@/components/trash";
import { useBentoLineHeight } from "@/hooks/use-bento-line-height";
import type { BentoCommand } from "@/lib/bento/bento-types";
import { getPageImageUrl } from "@/lib/page-image-url";
import {
	getPageImagePlaceholderUrl,
	getPageMediaUrl,
} from "@/lib/page-media-url";
import { LinkAuthorByline } from "./items/link-author-byline";

function LinkAction({
	href,
	mode,
	label,
	detail,
	icon,
	actionBackground,
	actionText,
	actionVariant,
	className: extraClassName,
}: {
	href: string;
	mode: "view" | "edit";
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
	const variant =
		actionVariant === "outline"
			? "outline"
			: hasTheme
				? "default"
				: "secondary";
	const style: CSSProperties = {
		...(hasTheme
			? { backgroundColor: actionBackground, color: actionText }
			: {}),
		boxShadow: "none",
	};
	const content = (
		<>
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
		</>
	);
	if (mode === "view") {
		return (
			<span
				className={cn(
					buttonVariants({ variant, size: "sm", className }),
					"motion-safe:active:not-aria-[haspopup]:scale-100",
				)}
				style={style}
			>
				{content}
			</span>
		);
	}
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
					{content}
				</a>
			}
			nativeButton={false}
			variant={variant}
			size="sm"
			style={style}
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
		const parsed = JSON.parse(value) as unknown;
		if (
			typeof parsed !== "object" ||
			parsed === null ||
			!Array.isArray((parsed as { weeks?: unknown }).weeks)
		) {
			return undefined;
		}
		const weeks = (parsed as { weeks: unknown[] }).weeks
			.filter(
				(week): week is { days?: unknown } =>
					typeof week === "object" && week !== null,
			)
			.map((week) => ({
				days: Array.isArray(week.days) ? week.days : [],
			}))
			.filter((week) => week.days.length > 0);
		return weeks.length > 0
			? {
					totalContributions: 0,
					weeks: weeks as GithubContributionGraphData["weeks"],
				}
			: undefined;
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
	imagePlaceholderDataUrl,
	backgroundColor,
}: {
	imageUrls: readonly string[];
	imagePlaceholderDataUrl?: string;
	backgroundColor?: string;
}) {
	if (imageUrls.length > 1) {
		return (
			<div className="grid size-full grid-cols-2 gap-2 overflow-hidden">
				{imageUrls.map((imageUrl) => (
					<div
						key={imageUrl}
						className="min-h-0 min-w-0 overflow-hidden rounded-md bg-muted/30"
					>
						<LinkPreviewImage key={imageUrl} imageUrl={imageUrl} />
					</div>
				))}
			</div>
		);
	}
	const imageUrl = imageUrls[0];
	return imageUrl ? (
		<div className="size-full overflow-hidden rounded-[inherit]">
			<LinkPreviewImage
				key={`${imageUrl}:${imagePlaceholderDataUrl ?? ""}`}
				imageUrl={imageUrl}
				imagePlaceholderDataUrl={imagePlaceholderDataUrl}
			/>
		</div>
	) : (
		<div
			className="link-image-placeholder flex size-full items-center justify-center px-4 text-center font-semibold text-lg tracking-tight"
			style={{ backgroundColor }}
		/>
	);
}

function LinkPreviewImage({
	imageUrl,
	imagePlaceholderDataUrl,
}: {
	imageUrl: string;
	imagePlaceholderDataUrl?: string;
}) {
	const imageRef = useRef<HTMLDivElement>(null);
	const [hasEnteredViewport, setHasEnteredViewport] = useState(false);
	const [imageLoaded, setImageLoaded] = useState(false);
	const [placeholderFailed, setPlaceholderFailed] = useState(false);
	const [transformedImageFailed, setTransformedImageFailed] = useState(false);
	const [imageFailed, setImageFailed] = useState(false);
	const transformedImageUrl = getPageMediaUrl(imageUrl, "image");
	const imageSrc = transformedImageFailed ? imageUrl : transformedImageUrl;
	const placeholderUrl = imagePlaceholderDataUrl
		? imagePlaceholderDataUrl
		: hasEnteredViewport
			? getPageImagePlaceholderUrl(imageUrl)
			: undefined;

	useEffect(() => {
		const image = imageRef.current;
		if (!image || typeof IntersectionObserver === "undefined") {
			setHasEnteredViewport(true);
			return;
		}

		const observer = new IntersectionObserver(([entry]) => {
			if (entry?.isIntersecting) setHasEnteredViewport(true);
		});
		observer.observe(image);
		return () => observer.disconnect();
	}, []);

	return (
		<div
			ref={imageRef}
			className="relative size-full overflow-hidden rounded-[inherit] bg-muted/30 outline-depth"
		>
			{placeholderUrl && !placeholderFailed ? (
				<img
					alt=""
					aria-hidden="true"
					className="pointer-events-none absolute inset-0 size-full scale-110 object-cover blur-md"
					loading="lazy"
					src={placeholderUrl}
					onError={() => setPlaceholderFailed(true)}
				/>
			) : null}
			{hasEnteredViewport && !imageFailed ? (
				<img
					alt=""
					className={`absolute inset-0 size-full object-cover transition-opacity ${!placeholderUrl || placeholderFailed || imageLoaded ? "opacity-100" : "opacity-0"}`}
					loading="lazy"
					src={imageSrc}
					onLoad={() => setImageLoaded(true)}
					onError={() => {
						if (imageSrc !== imageUrl) setTransformedImageFailed(true);
						else setImageFailed(true);
					}}
				/>
			) : null}
		</div>
	);
}

function LinkImageControls({
	hasImage,
	isAnyItemDragging,
	onSelect,
	onDelete,
}: {
	hasImage: boolean;
	isAnyItemDragging: boolean;
	onSelect?: (file: File) => void | Promise<void>;
	onDelete?: () => void;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	if (!onSelect) return null;
	return (
		<>
			<div
				className={`pointer-events-none absolute -top-3 left-2 z-20 flex h-9 w-max items-center gap-1 rounded-lg bg-black p-1 opacity-0 shadow-lg transition-opacity duration-150 group-focus-within/link-image:pointer-events-auto group-focus-within/link-image:opacity-100 group-hover/link-image:pointer-events-auto group-hover/link-image:opacity-100 motion-reduce:transition-none ${isAnyItemDragging ? "pointer-events-none! opacity-0!" : ""}`}
			>
				<Button
					type="button"
					size="icon-sm"
					variant="ghost"
					aria-label={hasImage ? "Replace link image" : "Add link image"}
					title={hasImage ? "Replace link image" : "Add link image"}
					data-bento-item-drag-cancel="true"
					className="size-7 cursor-pointer! rounded-md text-white hover:bg-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60"
					onClick={() => inputRef.current?.click()}
				>
					<CircleFadingArrowUp className="size-5" aria-hidden="true" />
				</Button>
				{onDelete ? (
					<Button
						type="button"
						size="icon-sm"
						variant="ghost"
						disabled={!hasImage}
						aria-label="Remove link image"
						title="Remove link image"
						data-bento-item-drag-cancel="true"
						className="size-7 cursor-pointer! rounded-md text-white hover:bg-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed! disabled:opacity-40 disabled:hover:bg-transparent"
						onClick={onDelete}
					>
						<Trash className="size-5" aria-hidden="true" />
					</Button>
				) : null}
			</div>
			<input
				ref={inputRef}
				type="file"
				accept="image/*"
				className="sr-only"
				tabIndex={-1}
				onChange={(event) => {
					const file = event.currentTarget.files?.[0];
					event.currentTarget.value = "";
					if (file) void onSelect(file);
				}}
			/>
		</>
	);
}

function LinkImageArea({
	imageUrls,
	imagePlaceholderDataUrl,
	backgroundColor,
	flexClassName,
	mode,
	hasImage,
	isAnyItemDragging,
	onSelect,
	onDelete,
}: {
	imageUrls: readonly string[];
	imagePlaceholderDataUrl?: string;
	backgroundColor?: string;
	flexClassName: string;
	mode: "view" | "edit";
	hasImage: boolean;
	isAnyItemDragging: boolean;
	onSelect?: (file: File) => void | Promise<void>;
	onDelete?: () => void;
}) {
	return (
		<div
			className={`group/link-image relative min-h-0 min-w-0 ${flexClassName}`}
		>
			<div className="size-full min-h-0 overflow-hidden rounded-lg bg-muted/30">
				<LinkPreview
					imageUrls={imageUrls}
					imagePlaceholderDataUrl={imagePlaceholderDataUrl}
					backgroundColor={backgroundColor}
				/>
			</div>
			{mode === "edit" && imageUrls.length <= 1 ? (
				<LinkImageControls
					hasImage={hasImage}
					isAnyItemDragging={isAnyItemDragging}
					onSelect={onSelect}
					onDelete={onDelete}
				/>
			) : null}
		</div>
	);
}

function LinkBadge({
	item,
	presentation,
	preset,
	mode,
}: {
	item: Extract<PageItemResponse, { type: "link" }>;
	presentation?: PageItemLinkPresentation;
	preset: PresetName;
	mode: "view" | "edit";
}) {
	const Badge = mode === "view" ? "span" : "a";
	const faviconUrl = item.data.metadata?.faviconUrl;
	const providerLabel = presentation?.providerLabel ?? "Link";
	const [failedFaviconUrl, setFailedFaviconUrl] = useState<string>();
	const faviconFailed = failedFaviconUrl === faviconUrl;
	const faviconSrc = faviconUrl?.startsWith("/api/provider-icons/")
		? `${faviconUrl}?v=3`
		: faviconUrl;
	const iconSizeClassName =
		preset === "squareSmall" || preset === "halfBanner" ? "size-4" : "size-6";
	return (
		<Badge
			href={mode === "edit" ? item.data.url : undefined}
			target={mode === "edit" ? "_blank" : undefined}
			rel={mode === "edit" ? "noreferrer" : undefined}
			aria-label={mode === "edit" ? `Open ${providerLabel}` : undefined}
			className="smooth-shadow-xs relative inline-flex size-8 shrink-0 cursor-pointer! items-center justify-center overflow-hidden rounded-lg bg-background outline-depth transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
		>
			{faviconUrl && !faviconFailed ? (
				<img
					src={faviconSrc}
					alt=""
					className="size-full rounded-[inherit] bg-transparent object-contain"
					onError={() => setFailedFaviconUrl(faviconUrl)}
				/>
			) : (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					className={`lucide lucide-link-2 preview-icon -rotate-z-45 ${iconSizeClassName}`}
					aria-hidden="true"
				>
					<path d="M9 17H7A5 5 0 0 1 7 7h2" />
					<path d="M15 7h2a5 5 0 1 1 0 10h-2" />
					<line x1="8" x2="16" y1="12" y2="12" />
				</svg>
			)}
		</Badge>
	);
}

function LinkTitle({
	title,
	preset,
	mode,
	onCommit,
}: {
	title: string;
	preset: PresetName;
	mode: "view" | "edit";
	onCommit: (value: string) => void;
}) {
	const isHalfBanner = preset === "halfBanner";
	const isLandscape = preset === "landscape";
	const isSquareSmall = preset === "squareSmall";
	const isTall = preset === "squareLarge" || preset === "portrait";
	const [value, setValue] = useState(title);
	const { viewportRef, lineHeight } = useBentoLineHeight();
	useEffect(() => setValue(title), [title]);
	const titleAlignmentClassName = isHalfBanner ? "" : "-mx-1";
	const titleClassName = `field-sizing-fixed block min-h-0 w-full min-w-24 max-w-full rounded-sm px-1 py-0 font-normal text-foreground text-sm ${
		isHalfBanner
			? "h-8 max-h-8 overflow-hidden whitespace-nowrap leading-8"
			: "h-full leading-5"
	}`;
	const titleViewportClassName = `min-h-0 min-w-0 w-full text-sm ${isHalfBanner ? "leading-8" : "leading-5"} ${
		isHalfBanner ? "h-8" : isTall ? "max-h-20 flex-1" : "flex-1"
	}`;

	if (mode === "edit") {
		return (
			<div ref={viewportRef} className={titleViewportClassName}>
				<Textarea
					aria-label="Link title"
					rows={1}
					value={value}
					wrap={isHalfBanner ? "off" : "soft"}
					style={{
						lineHeight,
						...(isHalfBanner ? { width: "100%", maxWidth: "100%" } : {}),
					}}
					onChange={(event) => setValue(event.target.value)}
					onBlur={(event) => {
						event.currentTarget.scrollTo({
							top: 0,
							left: 0,
							behavior: "smooth",
						});
						const nextValue = value.trim();
						if (nextValue) onCommit(nextValue);
					}}
					className={`link-title-input ${titleAlignmentClassName} cursor-text! resize-none border-0 bg-transparent text-current outline-none focus-visible:ring-0 ${titleClassName} overflow-y-auto overflow-x-hidden overscroll-y-contain`}
				/>
			</div>
		);
	}
	return (
		<div ref={viewportRef} className={titleViewportClassName}>
			<div
				style={{ lineHeight }}
				className={`wrap-break-word ${titleAlignmentClassName} ${titleClassName} ${
					isHalfBanner
						? "truncate"
						: isLandscape || isSquareSmall || isTall
							? "no-scrollbar overflow-y-auto overscroll-y-contain whitespace-pre-line"
							: "truncate"
				}`}
			>
				{title}
			</div>
		</div>
	);
}

export function LinkItem({
	item,
	preset,
	mode = "view",
	onCommand,
	isAnyItemDragging = false,
	onImageSelect,
}: {
	item: Extract<PageItemResponse, { type: "link" }>;
	preset: PresetName;
	mode?: "view" | "edit";
	onCommand?: (command: BentoCommand) => void;
	isAnyItemDragging?: boolean;
	onImageSelect?: (file: File) => void | Promise<void>;
}) {
	const metadata = item.data.metadata;
	const presentation = metadata?.presentation;
	const authorData =
		metadata?.provider === "behance" || metadata?.provider === "pinterest"
			? metadata.providerData
			: undefined;
	const authorName =
		typeof authorData?.authorName === "string"
			? authorData.authorName
			: undefined;
	const authorProfileImageUrl =
		typeof authorData?.authorProfileImageUrl === "string"
			? authorData.authorProfileImageUrl
			: undefined;
	const showAuthorName = preset === "squareLarge";
	const renderAuthor = (showName: boolean) =>
		authorName ? (
			<LinkAuthorByline
				name={authorName}
				imageUrl={authorProfileImageUrl}
				showName={showName}
				className={
					metadata?.provider === "behance"
						? "text-muted-foreground/60"
						: undefined
				}
			/>
		) : null;
	const title = metadata?.title?.trim() || item.data.url;
	const linkCardClassName = presentation?.cardBackground
		? "link-card-themed"
		: "";
	const linkCardStyle =
		mode === "edit" && presentation?.cardBackground
			? ({
					backgroundColor: presentation.cardBackground,
					"--link-card-background": presentation.cardBackground,
				} as CSSProperties)
			: undefined;
	const ownedImageUrl =
		typeof item.data.imageKey === "string"
			? getPageImageUrl(item.data.imageKey)
			: undefined;
	const hasMultipleImages = (presentation?.imageUrls?.length ?? 0) > 1;
	const imageUrls = ownedImageUrl
		? [ownedImageUrl]
		: item.data.imageKey === null && !hasMultipleImages
			? []
			: (presentation?.imageUrls ??
				(metadata?.imageUrl ? [metadata.imageUrl] : []));
	const imagePlaceholderDataUrl = ownedImageUrl
		? item.data.imagePlaceholderDataUrl
		: undefined;
	const hasImage = imageUrls.length > 0;
	const githubGraph = parseGithubContributionGraph(
		presentation?.githubContributionGraph,
	);
	const isGithubGraphPreset =
		(preset === "landscape" ||
			preset === "portrait" ||
			preset === "squareLarge") &&
		Boolean(githubGraph);
	const shouldShowLinkAction = Boolean(presentation?.actionLabel);
	const actionIcon =
		presentation?.actionIcon === "upvote" ? (
			<TriangleIcon className="size-3 fill-current" />
		) : presentation?.actionIcon === "like2" ? (
			<Like2 weight="Filled" className="size-3" />
		) : undefined;
	const updateTitle = (value: string) =>
		onCommand?.({
			type: "update-data",
			itemId: item.id,
			data: {
				...item.data,
				metadata: { ...item.data.metadata, title: value },
			},
		});
	const removeImage = () => {
		onCommand?.({
			type: "update-data",
			itemId: item.id,
			data: {
				...item.data,
				imageKey: null,
				imagePlaceholderDataUrl: undefined,
			},
		});
	};
	const linkActionProps = {
		mode,
		label: presentation?.actionLabel ?? "Open",
		detail: presentation?.actionDetail,
		icon: actionIcon,
		actionBackground: presentation?.actionBackground,
		actionText: presentation?.actionText,
		actionVariant: presentation?.actionVariant,
	};
	const isLandscape = preset === "landscape";
	const isTall = preset === "squareLarge" || preset === "portrait";
	const content = (
		<div
			className={`flex min-h-0 min-w-0 flex-col items-start gap-3 ${
				isLandscape
					? "h-full flex-4 items-stretch justify-between"
					: isTall
						? "flex-3 items-stretch justify-between"
						: ""
			} ${linkCardClassName}`}
			style={linkCardStyle}
		>
			<div
				className={`flex min-h-0 min-w-0 flex-col items-start gap-2 ${
					isLandscape ? "w-full flex-1" : isTall ? "flex-1 items-stretch" : ""
				}`}
			>
				<LinkBadge
					item={item}
					presentation={presentation}
					preset={preset}
					mode={mode}
				/>
				<LinkTitle
					title={title}
					preset={preset}
					mode={mode}
					onCommit={updateTitle}
				/>
			</div>
			{authorName ? (
				<div className="flex w-full min-w-0 flex-row items-center justify-between gap-2">
					{shouldShowLinkAction ? (
						<LinkAction
							href={item.data.url}
							{...linkActionProps}
							className="self-center"
						/>
					) : null}
					{renderAuthor(showAuthorName)}
				</div>
			) : shouldShowLinkAction ? (
				<LinkAction href={item.data.url} {...linkActionProps} />
			) : null}
		</div>
	);

	const renderPreset = () => {
		if (preset === "squareSmall") {
			return (
				<div
					className={`flex size-full min-h-0 flex-col items-start justify-between gap-3 p-5 ${linkCardClassName}`}
					style={linkCardStyle}
				>
					<div className="flex min-h-0 w-full flex-1 flex-col gap-2">
						<LinkBadge
							item={item}
							presentation={presentation}
							preset={preset}
							mode={mode}
						/>
						<div className="flex min-h-0 min-w-0 flex-1 flex-col">
							<LinkTitle
								title={title}
								preset={preset}
								mode={mode}
								onCommit={updateTitle}
							/>
						</div>
					</div>
					{authorName ? (
						<div className="flex w-full flex-row items-center justify-between gap-2">
							{shouldShowLinkAction ? (
								<LinkAction
									href={item.data.url}
									{...linkActionProps}
									className="self-center"
								/>
							) : null}
							{renderAuthor(showAuthorName)}
						</div>
					) : shouldShowLinkAction ? (
						<LinkAction href={item.data.url} {...linkActionProps} />
					) : null}
				</div>
			);
		}

		if (preset === "halfBanner") {
			return (
				<div
					className={`flex size-full min-h-0 items-center justify-between gap-3 p-5 ${linkCardClassName}`}
					style={linkCardStyle}
				>
					<div className="flex min-w-0 flex-1 items-center gap-2">
						<LinkBadge
							item={item}
							presentation={presentation}
							preset={preset}
							mode={mode}
						/>
						<div className="min-h-0 min-w-0 flex-1">
							<LinkTitle
								title={title}
								preset={preset}
								mode={mode}
								onCommit={updateTitle}
							/>
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
				className={`flex size-full min-h-0 min-w-0 gap-3 p-5 ${
					isLandscape ? "flex-row-reverse items-stretch" : "flex-col"
				} ${linkCardClassName}`}
				style={linkCardStyle}
			>
				{isLandscape && isGithubGraphPreset && githubGraph ? (
					<div className="relative min-h-0 min-w-0 flex-4 overflow-hidden rounded-lg">
						<GithubContributionGraph data={githubGraph} preset="landscape" />
					</div>
				) : isLandscape ? (
					<LinkImageArea
						imageUrls={imageUrls}
						imagePlaceholderDataUrl={imagePlaceholderDataUrl}
						backgroundColor={
							mode === "edit" ? presentation?.cardBackground : undefined
						}
						flexClassName="flex-4"
						mode={mode}
						hasImage={hasImage}
						isAnyItemDragging={isAnyItemDragging}
						onSelect={onImageSelect}
						onDelete={removeImage}
					/>
				) : null}
				{content}
				{!isLandscape && isGithubGraphPreset && githubGraph ? (
					<div className="relative min-h-0 flex-3 overflow-hidden rounded-lg">
						<GithubContributionGraph
							data={githubGraph}
							preset={preset as "portrait" | "squareLarge"}
						/>
					</div>
				) : !isLandscape ? (
					<LinkImageArea
						imageUrls={imageUrls}
						imagePlaceholderDataUrl={imagePlaceholderDataUrl}
						backgroundColor={
							mode === "edit" ? presentation?.cardBackground : undefined
						}
						flexClassName="flex-3"
						mode={mode}
						hasImage={hasImage}
						isAnyItemDragging={isAnyItemDragging}
						onSelect={onImageSelect}
						onDelete={removeImage}
					/>
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
