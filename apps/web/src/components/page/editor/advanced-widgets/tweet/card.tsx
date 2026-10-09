"use client";

import { cn } from "@grabbin/ui/lib/utils";
import { Check, Link2 } from "lucide-react";
import { useState } from "react";
import { type EnrichedTweet, enrichTweet, useTweet } from "react-tweet";

const VerifiedBadge = ({ className }: { className?: string }) => (
	<svg
		viewBox="0 0 22 22"
		className={className}
		fill="currentColor"
		aria-label="Verified account"
		role="img"
	>
		<path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
	</svg>
);

const formatNumber = (num: number): string => {
	if (num >= 1000000) {
		return `${(num / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
	}
	if (num >= 1000) {
		return `${(num / 1000).toFixed(1).replace(/\.0$/, "")}k`;
	}
	return num.toString();
};

const formatDate = (dateString: string): string => {
	const date = new Date(dateString);
	const hours = date.getHours();
	const minutes = date.getMinutes();
	const ampm = hours >= 12 ? "PM" : "AM";
	const hour12 = hours % 12 || 12;
	const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(
		date,
	);
	return `${hour12}:${minutes.toString().padStart(2, "0")} ${ampm} · ${month} ${date.getDate()}, ${date.getFullYear()}`;
};

export const TweetSkeleton = ({ className }: { className?: string }) => (
	<div
		className={cn(
			"flex size-full min-h-0 w-full max-w-[590px] flex-col overflow-hidden rounded-xl p-4 not-dark:shadow-[0_0_0_1px_rgba(0,0,0,.08),_0px_2px_2px_rgba(0,0,0,.04)] dark:border dark:border-muted",
			className,
		)}
	>
		<div className="flex items-start justify-between">
			<div className="flex items-center gap-2">
				<div className="size-[38px] shrink-0 animate-pulse rounded-full bg-muted outline-depth" />
				<div className="flex flex-col">
					<div className="h-[18px] w-24 animate-pulse rounded bg-muted" />
					<div className="-mt-0.5 h-[15px] w-16 animate-pulse rounded bg-muted" />
				</div>
			</div>
			<div className="size-5 animate-pulse rounded bg-muted" />
		</div>
		<div className="mt-3 flex h-12 shrink-0 flex-col justify-between">
			<div className="h-4 w-full animate-pulse rounded bg-muted" />
			<div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
		</div>
		<div className="mt-3 min-h-0 flex-1 animate-pulse rounded-lg bg-muted" />
		<div className="mt-3 flex shrink-0 items-center justify-between border-muted border-t pt-2">
			<div className="h-3 w-28 animate-pulse rounded bg-muted" />
			<div className="h-[18px] w-10 animate-pulse rounded bg-muted" />
		</div>
	</div>
);

const TweetNotFound = ({ className }: { className?: string }) => (
	<div
		className={cn(
			"flex w-full max-w-[590px] flex-col items-center justify-center gap-2 rounded-xl p-6 text-muted-foreground not-dark:shadow-[0_0_0_1px_rgba(0,0,0,.08),_0px_2px_2px_rgba(0,0,0,.04)] dark:border dark:border-muted",
			className,
		)}
	>
		<p className="text-sm">Tweet not found</p>
	</div>
);

const TweetHeader = ({ tweet }: { tweet: EnrichedTweet }) => (
	<div className="flex items-start justify-between">
		<div className="flex items-center gap-2">
			<div className="size-[38px] shrink-0 overflow-hidden rounded-full">
				<img
					src={tweet.user.profile_image_url_https}
					alt={tweet.user.name}
					loading="lazy"
					width={38}
					height={38}
					className="size-full rounded-full outline-depth"
				/>
			</div>
			<div className="flex flex-col">
				<span className="flex items-center gap-1 font-semibold text-[15px] text-primary">
					{tweet.user.name}
					{(tweet.user.verified || tweet.user.is_blue_verified) && (
						<VerifiedBadge className="size-4 text-[#1C9BF1]" />
					)}
				</span>
				<span className="-mt-0.5 text-[13px] text-muted-foreground">
					@{tweet.user.screen_name}
				</span>
			</div>
		</div>
		<a href={tweet.url} target="_blank" rel="noopener noreferrer">
			<span className="sr-only">Open post on X</span>
			<svg
				viewBox="0 0 256 209"
				preserveAspectRatio="xMidYMid"
				className="size-5"
				aria-hidden="true"
			>
				<path
					d="M256 25.45c-9.42 4.177-19.542 7-30.166 8.27 10.845-6.5 19.172-16.793 23.093-29.057a105.183 105.183 0 0 1-33.351 12.745C205.995 7.201 192.346.822 177.239.822c-29.006 0-52.523 23.516-52.523 52.52 0 4.117.465 8.125 1.36 11.97-43.65-2.191-82.35-23.1-108.255-54.876-4.52 7.757-7.11 16.78-7.11 26.404 0 18.222 9.273 34.297 23.365 43.716a52.312 52.312 0 0 1-23.79-6.57c-.003.22-.003.44-.003.661 0 25.447 18.104 46.675 42.13 51.5a52.592 52.592 0 0 1-23.718.9c6.683 20.866 26.08 36.05 49.062 36.475-17.975 14.086-40.622 22.483-65.228 22.483-4.24 0-8.42-.249-12.529-.734 23.243 14.902 50.85 23.597 80.51 23.597 96.607 0 149.434-80.031 149.434-149.435 0-2.278-.05-4.543-.152-6.795A106.748 106.748 0 0 0 256 25.45"
					fill="#55acee"
				/>
			</svg>
		</a>
	</div>
);

const TweetBody = ({
	tweet,
	hasMedia,
}: {
	tweet: EnrichedTweet;
	hasMedia: boolean;
}) => (
	<p
		className={cn(
			"mt-3 min-h-0 text-primary leading-6",
			hasMedia
				? "line-clamp-2 shrink-0 overflow-hidden"
				: "flex-1 overflow-y-auto",
		)}
	>
		{tweet.entities.map((entity, idx) => {
			switch (entity.type) {
				case "url":
				case "symbol":
				case "hashtag":
				case "mention":
					return (
						<a
							key={idx}
							href={entity.href}
							target="_blank"
							rel="noopener noreferrer"
							className="text-[#1C9BF1] hover:underline"
						>
							{entity.text}
						</a>
					);
				case "text":
					return <span key={idx}>{entity.text}</span>;
				default:
					return null;
			}
		})}
	</p>
);

const TweetMedia = ({ tweet }: { tweet: EnrichedTweet }) => {
	if (!tweet.video?.variants?.length && !tweet.photos?.length) return null;

	const getVideoSource = () => {
		if (!tweet.video?.variants) return null;

		const getResolution = (url: string): number => {
			const match = url.match(/\/(\d+)x(\d+)\//);
			if (match) {
				return Number.parseInt(match[1], 10) * Number.parseInt(match[2], 10);
			}
			return 0;
		};

		const mp4Variants = tweet.video.variants
			.filter((v) => v.type === "video/mp4")
			.sort((a, b) => getResolution(b.src) - getResolution(a.src));

		if (mp4Variants.length > 0) {
			return { src: mp4Variants[0].src, type: "video/mp4" };
		}

		const firstVariant = tweet.video.variants[0];
		return { src: firstVariant.src, type: firstVariant.type };
	};

	const videoSource = getVideoSource();

	return (
		<div className="mt-3 min-h-0 flex-1 overflow-hidden">
			{tweet.video && videoSource ? (
				<div className="size-full overflow-hidden rounded-lg">
					<video
						poster={tweet.video.poster}
						autoPlay
						loop
						muted
						playsInline
						className="size-full rounded-lg object-cover outline-depth"
					>
						<source src={videoSource.src} type={videoSource.type} />
					</video>
				</div>
			) : tweet.photos?.length ? (
				<div
					className={cn(
						"grid size-full min-h-0 auto-rows-fr gap-1",
						tweet.photos.length === 1 && "grid-cols-1",
						tweet.photos.length === 2 && "grid-cols-2",
						tweet.photos.length >= 3 && "grid-cols-2",
					)}
				>
					{tweet.photos.map((photo, idx) => (
						<div
							key={photo.url}
							className={cn(
								"size-full min-h-0 min-w-0 overflow-hidden rounded-lg",
								tweet.photos &&
									tweet.photos.length === 3 &&
									idx === 0 &&
									"row-span-2",
							)}
						>
							<img
								src={photo.url}
								alt={`Post attachment ${idx + 1}`}
								loading="lazy"
								className="size-full min-h-0 min-w-0 rounded-lg object-cover outline-depth"
							/>
						</div>
					))}
				</div>
			) : null}
		</div>
	);
};

interface TweetFooterProps {
	tweet: EnrichedTweet;
	showDate?: boolean;
	showLikeButton?: boolean;
	showCopyLink?: boolean;
}

const TweetFooter = ({
	tweet,
	showDate = true,
	showLikeButton = true,
	showCopyLink = true,
}: TweetFooterProps) => {
	const [isCopied, setIsCopied] = useState(false);

	const handleCopyLink = () => {
		navigator.clipboard.writeText(tweet.url).catch(() => {});
		setIsCopied(true);
		setTimeout(() => setIsCopied(false), 1500);
	};

	const showActions = showLikeButton || showCopyLink;

	if (!showDate && !showActions) return null;

	return (
		<div className="mt-3 shrink-0">
			{showDate || showActions ? (
				<div className="flex min-w-0 items-center justify-between gap-2 border-muted border-t pt-2">
					{showDate ? (
						<time
							className="truncate text-muted-foreground text-xs"
							dateTime={tweet.created_at}
						>
							{formatDate(tweet.created_at)}
						</time>
					) : null}
					{showActions ? (
						<div className="flex shrink-0 gap-4">
							{showLikeButton && (
								<a
									href={`https://x.com/intent/like?tweet_id=${tweet.id_str}`}
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center gap-1.5 text-muted-foreground"
								>
									<svg
										className="text-[#F91880]"
										xmlns="http://www.w3.org/2000/svg"
										width="18"
										height="18"
										viewBox="0 0 18 18"
										aria-hidden="true"
									>
										<g fill="currentColor">
											<path
												d="M12.164,2c-1.195,.015-2.324,.49-3.164,1.306-.84-.815-1.972-1.291-3.178-1.306-2.53,.015-4.582,2.084-4.572,4.609,0,5.253,5.306,8.429,6.932,9.278,.256,.133,.537,.2,.818,.2s.562-.067,.817-.2c1.626-.848,6.933-4.024,6.933-9.275,.009-2.528-2.042-4.597-4.586-4.612Z"
												fill="currentColor"
											/>
										</g>
									</svg>
									<span className="text-medium text-xs transition-colors hover:text-[#F91880]">
										{formatNumber(tweet.favorite_count)}
									</span>
								</a>
							)}
							{showCopyLink && (
								<button
									type="button"
									onClick={handleCopyLink}
									className="flex cursor-pointer items-center gap-1.5 text-muted-foreground"
								>
									{isCopied ? (
										<Check className="size-4 text-emerald-500" />
									) : (
										<Link2 className="size-4" />
									)}
									<span className="text-medium text-sm">Copy link</span>
								</button>
							)}
						</div>
					) : null}
				</div>
			) : null}
		</div>
	);
};

interface TweetContentProps {
	tweet: EnrichedTweet;
	className?: string;
	showDate?: boolean;
	showLikeButton?: boolean;
	showCopyLink?: boolean;
}

const TweetContent = ({
	tweet,
	className,
	showDate,
	showLikeButton,
	showCopyLink,
}: TweetContentProps) => {
	const hasMedia = Boolean(
		tweet.video?.variants?.length || tweet.photos?.length,
	);

	return (
		<div
			className={cn(
				"flex size-full min-h-0 w-full max-w-[590px] flex-col overflow-hidden rounded-xl p-4 not-dark:shadow-[0_0_0_1px_rgba(0,0,0,.08),_0px_2px_2px_rgba(0,0,0,.04)] dark:border dark:border-muted",
				className,
			)}
		>
			<TweetHeader tweet={tweet} />
			<TweetBody tweet={tweet} hasMedia={hasMedia} />
			<TweetMedia tweet={tweet} />
			<TweetFooter
				tweet={tweet}
				showDate={showDate}
				showLikeButton={showLikeButton}
				showCopyLink={showCopyLink}
			/>
		</div>
	);
};

interface TweetProps {
	id: string;
	className?: string;
	showDate?: boolean;
	showLikeButton?: boolean;
	showCopyLink?: boolean;
}

export function Tweet({
	id,
	className,
	showDate = true,
	showLikeButton = true,
	showCopyLink = true,
}: TweetProps) {
	const { data: tweet, isLoading, error } = useTweet(id);

	if (isLoading) {
		return <TweetSkeleton className={className} />;
	}

	if (error || !tweet) {
		return <TweetNotFound className={className} />;
	}

	// X's syndication API omits empty entity arrays, but react-tweet's
	// enrichTweet assumes they exist and throws "n is not iterable" otherwise.
	let enrichedTweet: EnrichedTweet;
	try {
		const entities = tweet.entities ?? {
			hashtags: [],
			urls: [],
			user_mentions: [],
			symbols: [],
		};
		enrichedTweet = enrichTweet({
			...tweet,
			entities: {
				...entities,
				hashtags: entities.hashtags ?? [],
				urls: entities.urls ?? [],
				user_mentions: entities.user_mentions ?? [],
				symbols: entities.symbols ?? [],
			},
		});
	} catch {
		return <TweetNotFound className={className} />;
	}

	return (
		<TweetContent
			tweet={enrichedTweet}
			className={className}
			showDate={showDate}
			showLikeButton={showLikeButton}
			showCopyLink={showCopyLink}
		/>
	);
}
