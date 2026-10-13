"use client";

import type {
	ItemType,
	PageByHandleResponse,
	PageItemLinkMetadata,
} from "@grabbin/api";
import {
	type BentoBreakpoint,
	getBentoGridHeight,
} from "@grabbin/bento-layout";
import { providerIconUrl, resolveLinkProvider } from "@grabbin/page-link";
import { toast } from "@grabbin/ui/components/toast";
import { useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { type CSSProperties, useCallback, useEffect, useRef } from "react";
import type { Tweet as TweetResponse } from "react-tweet/api";
import { useRssWidgetActions } from "@/features/rss/hooks/use-rss-widget-actions";
import { useFetchBentoSpotifyPreviewMutation } from "@/features/spotify/mutations/preview";
import { getTweetQueryOptions } from "@/features/tweet/queries/by-id";
import { getTweetId } from "@/features/tweet/utils/tweet-url";
import { useBentoStore } from "@/lib/bento/bento-store";
import { getErrorMessage } from "@/lib/error-message";
import type { AddWidgetButtonProps } from "./add-widget-button";
import EditMobileShareLinkButton from "./mobile-share-link-button";

const BentoSection = dynamic(() => import("./bento/bento-section"), {
	ssr: false,
});

export default function BentoEditor({
	items,
	handle,
	breakpoint,
	isAutoSaving,
	demoMode = false,
	profileImageUrl,
	entryAnimationRevision,
	entryReady,
	onReady,
	onGridSavingChange,
	onWidgetActionsChange,
}: {
	items: PageByHandleResponse["items"];
	handle: string;
	breakpoint: BentoBreakpoint;
	isAutoSaving: boolean;
	demoMode?: boolean;
	profileImageUrl: string | null;
	entryAnimationRevision: number;
	entryReady: boolean;
	onReady?: () => void;
	onGridSavingChange?: (isSaving: boolean) => void;
	onWidgetActionsChange?: (actions: AddWidgetButtonProps) => void;
}) {
	const initialItemIdsRef = useRef({
		handle,
		ids: new Set(items.map((item) => item.id)),
	});
	if (initialItemIdsRef.current.handle !== handle) {
		initialItemIdsRef.current = {
			handle,
			ids: new Set(items.map((item) => item.id)),
		};
	}
	const store = useBentoStore({
		initialItems: items,
		handle,
		persistItems: !demoMode,
	});
	const spotifyPreviewMutation = useFetchBentoSpotifyPreviewMutation();
	const { addRssFeed, previewRssFeed } = useRssWidgetActions(
		handle,
		store.dispatchCommand,
	);
	const queryClient = useQueryClient();
	const spotifyPreviewRequestRef = useRef<{
		handle: string;
		url: string;
		promise: Promise<PageItemLinkMetadata>;
	} | null>(null);
	useEffect(() => {
		onGridSavingChange?.(store.status === "saving");
	}, [onGridSavingChange, store.status]);

	const addItem = useCallback(
		(itemType: Exclude<ItemType, "calendly">, url?: string) => {
			if (itemType === "link") {
				try {
					if (new URL(url?.trim() ?? "").protocol !== "https:") {
						throw new Error();
					}
				} catch {
					toast({ message: "Enter a valid HTTPS link.", state: "error" });
					return;
				}
			}
			const addedItem = store.dispatchCommand({
				type: "add-item",
				itemType,
				url,
			});
			if (itemType === "link" && addedItem?.type === "link") {
				void store.refreshLinkMetadata(addedItem.id).catch(() => {});
			}
		},
		[store.dispatchCommand, store.refreshLinkMetadata],
	);
	const addCalendlyItem = useCallback(
		async (event: import("@grabbin/api").CalendlyEventType) => {
			store.dispatchCommand({ type: "add-calendly-item", event });
			await store.flushPendingChanges();
		},
		[store.dispatchCommand, store.flushPendingChanges],
	);
	const addTweet = useCallback(
		async (url: string) => {
			const tweetId = getTweetId(url);
			if (!tweetId) return false;
			const normalizedUrl = `https://x.com/i/status/${tweetId}`;
			let tweetResponse: TweetResponse | undefined;
			try {
				tweetResponse = await queryClient.fetchQuery(
					getTweetQueryOptions(tweetId),
				);
			} catch {
				toast({
					message: "Unable to load this Tweet. Try again.",
					state: "error",
				});
				return false;
			}
			if (!tweetResponse || tweetResponse.id_str !== tweetId) {
				toast({
					message: "Unable to load this Tweet. Try again.",
					state: "error",
				});
				return false;
			}

			const addedItem = store.dispatchCommand({
				type: "add-item",
				itemType: "link",
				url: normalizedUrl,
			});
			if (addedItem?.type !== "link") return false;

			store.dispatchCommand({
				type: "update-data",
				itemId: addedItem.id,
				data: {
					...addedItem.data,
					metadata: {
						title: "X post",
						faviconUrl: providerIconUrl("tweet"),
						provider: "tweet",
						providerData: {
							tweet: { response: tweetResponse },
						},
					},
				},
			});
			store.dispatchCommand({
				type: "apply-preset",
				itemId: addedItem.id,
				breakpoint: "wide",
				preset: "squareLarge",
			});
			store.dispatchCommand({
				type: "apply-preset",
				itemId: addedItem.id,
				breakpoint: "compact",
				preset: "squareLarge",
			});
			return true;
		},
		[queryClient, store.dispatchCommand],
	);
	const previewSpotify = useCallback(
		(url: string) => {
			const cached = spotifyPreviewRequestRef.current;
			if (cached?.handle === handle && cached.url === url)
				return cached.promise;

			const request = spotifyPreviewMutation
				.mutateAsync({ handle, url })
				.catch((error) => {
					if (spotifyPreviewRequestRef.current?.promise === request)
						spotifyPreviewRequestRef.current = null;
					throw error;
				});
			spotifyPreviewRequestRef.current = { handle, url, promise: request };
			return request;
		},
		[handle, spotifyPreviewMutation.mutateAsync],
	);
	const addSpotify = useCallback(
		async (url: string, metadata: PageItemLinkMetadata) => {
			let parsedUrl: URL;
			try {
				parsedUrl = new URL(url.trim());
			} catch {
				return false;
			}
			const resolved = resolveLinkProvider(parsedUrl);
			if (
				parsedUrl.protocol !== "https:" ||
				resolved.id !== "spotify" ||
				!resolved.target ||
				metadata.provider !== "spotify" ||
				!metadata.title ||
				!metadata.providerData?.spotify
			)
				return false;

			const normalizedUrl = parsedUrl.toString();
			const addedItem = store.dispatchCommand({
				type: "add-item",
				itemType: "link",
				url: normalizedUrl,
			});
			if (addedItem?.type !== "link") return false;

			store.dispatchCommand({
				type: "update-data",
				itemId: addedItem.id,
				data: {
					...addedItem.data,
					metadata: {
						...metadata,
						faviconUrl: metadata.faviconUrl ?? providerIconUrl("spotify"),
						widget: "spotify",
					},
				},
			});
			return true;
		},
		[store.dispatchCommand],
	);
	const editorClassName =
		breakpoint === "compact"
			? "relative flex w-full max-w-lg shrink-0 flex-col overflow-visible bg-transparent px-6 pb-0 no-scrollbar"
			: "relative flex min-w-0 flex-1 flex-col overflow-visible bg-background px-6 pt-12 pb-0 no-scrollbar page-wide:w-4xl page-wide:max-w-none page-wide:flex-none page-wide:pt-16";
	const bentoGridHeight = Math.max(
		getBentoGridHeight(
			store.items.map((item) => item.layouts.compact),
			"compact",
		),
		getBentoGridHeight(
			store.items.map((item) => item.layouts.wide),
			"wide",
		),
	);

	const selectMedia = useCallback(
		async (file: File) => {
			if (!/^(image|video)\//i.test(file.type)) {
				toast({ message: "Choose an image or video file.", state: "error" });
				return;
			}
			try {
				await store.addMediaUpload(file);
			} catch (error) {
				toast({
					message: getErrorMessage(error, "The media upload failed."),
					state: "error",
				});
			}
		},
		[store.addMediaUpload],
	);
	useEffect(() => {
		onWidgetActionsChange?.({
			onItemAdd: addItem,
			onCalendlyAdd: addCalendlyItem,
			onRssFeedAdd: addRssFeed,
			onRssFeedPreview: previewRssFeed,
			onSpotifyPreview: previewSpotify,
			onSpotifyAdd: addSpotify,
			onTweetAdd: addTweet,
			onMediaSelect: selectMedia,
		});
	}, [
		addCalendlyItem,
		addItem,
		addRssFeed,
		previewRssFeed,
		previewSpotify,
		addSpotify,
		addTweet,
		onWidgetActionsChange,
		selectMedia,
	]);
	const selectLinkImage = async (itemId: string, file: File) => {
		if (!/^image\//i.test(file.type)) {
			toast({ message: "Choose an image file.", state: "error" });
			return;
		}
		try {
			await store.replaceLinkImage(itemId, file);
		} catch (error) {
			toast({
				message: getErrorMessage(error, "The image upload failed."),
				state: "error",
			});
		}
	};
	return (
		<section
			className={`bento-editor ${editorClassName} min-h-[calc(var(--bento-grid-height)+16rem)] page-wide:min-h-0`}
			style={{ "--bento-grid-height": `${bentoGridHeight}px` } as CSSProperties}
		>
			<BentoSection
				handle={handle}
				items={store.items}
				initialItemIds={initialItemIdsRef.current.ids}
				mode="edit"
				breakpoint={breakpoint}
				entryAnimationRevision={entryAnimationRevision}
				entryReady={entryReady}
				onReady={onReady}
				autoFocusItemId={store.autoFocusItemId}
				onAutoFocus={store.clearAutoFocusItem}
				onCommand={store.dispatchCommand}
				onRefreshLinkMetadata={store.refreshLinkMetadata}
				onLinkImageSelect={selectLinkImage}
			/>
			<EditMobileShareLinkButton
				isAutoSaving={isAutoSaving}
				profileImageUrl={profileImageUrl}
			/>
		</section>
	);
}
