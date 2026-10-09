"use client";

import type { RssFeedResponse } from "@grabbin/api";
import type { PresetName } from "@grabbin/bento-layout";
import { Input } from "@grabbin/ui/components/input";
import {
	Item,
	ItemContent,
	ItemDescription,
	ItemSeparator,
	ItemTitle,
} from "@grabbin/ui/components/item";
import { ScrollArea } from "@grabbin/ui/components/scroll-area";
import { Separator } from "@grabbin/ui/components/separator";
import { Textarea } from "@grabbin/ui/components/textarea";
import { useEffect, useState } from "react";
import { useBentoLineHeight } from "@/hooks/use-bento-line-height";

function RssArticle({
	item,
	isLast,
}: {
	item: RssFeedResponse["items"][number];
	isLast: boolean;
}) {
	return (
		<li>
			<Item
				variant="default"
				size="sm"
				render={<a href={item.url} target="_blank" rel="noreferrer" />}
				className="min-w-0 cursor-pointer! flex-nowrap justify-start whitespace-normal px-2 py-2 text-left"
			>
				<ItemContent className="min-w-0 gap-1">
					<ItemTitle className="line-clamp-2 max-w-full whitespace-normal font-normal">
						{item.title}
					</ItemTitle>
					{item.publishedAt ? (
						<ItemDescription className="text-xs">
							<time dateTime={item.publishedAt}>
								{new Intl.DateTimeFormat("en-US", {
									month: "short",
									day: "numeric",
									year: "numeric",
									timeZone: "UTC",
								}).format(new Date(item.publishedAt))}
							</time>
						</ItemDescription>
					) : null}
				</ItemContent>
			</Item>
			{!isLast ? <ItemSeparator className="my-1" /> : null}
		</li>
	);
}

export function RssFeedWidget({
	url,
	feed,
	title,
	preset,
	mode,
	onTitleCommit,
}: {
	url: string;
	feed?: RssFeedResponse;
	title: string;
	preset: PresetName;
	mode: "view" | "edit";
	onTitleCommit?: (title: string) => void;
}) {
	const isHalfBanner = preset === "halfBanner";
	const isLandscape = preset === "landscape";
	const isSquareSmall = preset === "squareSmall";
	const isPortrait = preset === "portrait";
	const isSquareLarge = preset === "squareLarge";
	const singleLineTitle = isHalfBanner || isSquareLarge;
	const titleAreaCanGrow = isSquareSmall || isLandscape;
	const titleAreaClassName = singleLineTitle
		? "h-8 flex-1"
		: titleAreaCanGrow
			? "min-h-0 flex-1"
			: "h-10 flex-none";
	const titleAlignmentClassName = isHalfBanner ? "" : "-mx-1";
	const [value, setValue] = useState(title);
	const { viewportRef, lineHeight } = useBentoLineHeight();
	useEffect(() => setValue(title), [title]);
	const commitTitle = (nextValue: string) => {
		const nextTitle = nextValue.trim();
		if (nextTitle && nextTitle !== title) onTitleCommit?.(nextTitle);
	};
	const sourceTitle = title;
	const articles =
		preset === "halfBanner" || preset === "squareSmall"
			? []
			: (feed?.items ?? []);
	const titleArea = (
		<div
			ref={viewportRef}
			className={`min-h-0 w-full min-w-0 text-sm leading-5 ${titleAreaClassName}`}
		>
			{mode === "edit" ? (
				isHalfBanner || isSquareLarge ? (
					<Input
						aria-label="RSS feed title"
						value={value}
						onChange={(event) => setValue(event.target.value)}
						onBlur={() => commitTitle(value)}
						style={
							isHalfBanner ? { width: "100%", maxWidth: "100%" } : undefined
						}
						className={`link-title-input ${titleAlignmentClassName} field-sizing-fixed h-8 w-full min-w-0 rounded-sm border-0 bg-transparent px-1 py-0 font-normal text-foreground text-sm outline-none focus-visible:ring-0`}
					/>
				) : (
					<Textarea
						aria-label="RSS feed title"
						rows={2}
						value={value}
						style={{ lineHeight }}
						onChange={(event) => setValue(event.target.value)}
						onBlur={() => commitTitle(value)}
						className={`link-title-input ${titleAlignmentClassName} field-sizing-fixed ${titleAreaCanGrow ? "h-full max-h-full" : "h-10 max-h-10"} min-h-0 w-full resize-none overflow-y-auto overflow-x-hidden rounded-sm border-0 bg-transparent px-1 py-0 font-normal text-foreground text-sm outline-none focus-visible:ring-0`}
					/>
				)
			) : (
				<div
					style={{ lineHeight }}
					className={`wrap-break-word ${titleAlignmentClassName} px-1 ${singleLineTitle ? "truncate leading-8" : "no-scrollbar h-full overflow-y-auto overscroll-y-contain whitespace-pre-line"}`}
				>
					{sourceTitle}
				</div>
			)}
		</div>
	);
	const sourceIcon = (
		<a
			href={feed?.source.pageUrl ?? url}
			target="_blank"
			rel="noreferrer"
			aria-label="Open RSS source"
			className="group smooth-shadow-xs inline-flex size-9 shrink-0 cursor-pointer! items-center justify-center rounded-md border border-border bg-background transition-transform hover:scale-105"
		>
			<img
				src="/api/provider-icons/rss-feed.svg"
				alt=""
				className="size-6 rotate-z-30 object-contain transition-transform group-hover:rotate-z-0"
			/>
		</a>
	);
	const source = (
		<div
			className={`flex min-h-0 min-w-0 ${isHalfBanner || isSquareLarge ? "w-full flex-1 flex-row items-center gap-2" : `w-full ${titleAreaCanGrow ? "flex-1" : ""} flex-col items-start gap-2`}`}
		>
			{sourceIcon}
			{titleArea}
		</div>
	);
	const attribution = feed ? (
		<span className="inline-flex shrink-0 flex-row items-center gap-1 font-medium text-muted-foreground text-xs">
			<span>rss on</span>
			<img
				src={feed.source.iconUrl}
				alt=""
				aria-hidden="true"
				className="size-4 rounded-xs object-contain"
			/>
		</span>
	) : null;
	const articleList = articles.length ? (
		<ScrollArea className="[&_[data-slot=scroll-area-viewport]]:scroll-fade-y [&_[data-slot=scroll-area-viewport]]:scrollbar-none -mx-1 min-h-0 flex-1 [&_[data-slot=scroll-area-scrollbar]]:hidden">
			<ul className="flex min-h-0 flex-col">
				{articles.map((article, index) => (
					<RssArticle
						key={article.id}
						item={article}
						isLast={index === articles.length - 1}
					/>
				))}
			</ul>
		</ScrollArea>
	) : null;

	if (isHalfBanner) {
		return (
			<div className="flex size-full min-h-0 min-w-0 items-center gap-3 p-5">
				{source}
				{attribution}
			</div>
		);
	}
	if (isLandscape) {
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
	}
	if (isSquareLarge) {
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
	}
	if (isPortrait) {
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
	}
	return (
		<div
			className={`flex size-full min-h-0 min-w-0 flex-col gap-3 p-5 ${isSquareSmall ? "justify-between" : ""}`}
		>
			{source}
			{articleList}
			<div className="flex justify-end">{attribution}</div>
		</div>
	);
}
