import { cn } from "@grabbin/ui/lib/utils";

export const TweetSkeleton = ({
	className,
	isPortrait = false,
}: {
	className?: string;
	isPortrait?: boolean;
}) => (
	<div
		className={cn(
			"flex size-full min-h-0 w-full max-w-[590px] flex-col overflow-hidden rounded-[inherit] bg-white p-4",
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
			{!isPortrait ? (
				<div className="size-5 animate-pulse rounded bg-muted" />
			) : null}
		</div>
		<div
			className={cn("mt-3 shrink-0 space-y-2", isPortrait ? "h-24" : "h-12")}
		>
			<div className="h-4 w-full animate-pulse rounded bg-muted" />
			<div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
			{isPortrait ? (
				<>
					<div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
					<div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
				</>
			) : null}
		</div>
		<div className="mt-3 min-h-0 flex-1 animate-pulse rounded-lg bg-muted" />
		<div
			className={cn(
				"mt-3 flex shrink-0 items-center justify-between border-muted border-t pt-2",
				isPortrait && "flex-col items-stretch gap-2",
			)}
		>
			<div className="h-3 w-28 animate-pulse rounded bg-muted" />
			{isPortrait ? (
				<div className="flex items-center justify-between">
					<div className="h-[18px] w-10 animate-pulse rounded bg-muted" />
					<div className="size-8 animate-pulse rounded-full bg-muted" />
				</div>
			) : (
				<div className="h-[18px] w-10 animate-pulse rounded bg-muted" />
			)}
		</div>
	</div>
);

export default TweetSkeleton;
