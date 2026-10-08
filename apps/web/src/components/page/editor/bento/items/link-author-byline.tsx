import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@grabbin/ui/components/avatar";

export function LinkAuthorByline({
	name,
	imageUrl,
	showName = true,
}: {
	name?: string;
	imageUrl?: string;
	showName?: boolean;
}) {
	const authorName = name?.trim();
	if (!authorName) return null;

	const safeImageUrl = imageUrl?.startsWith("https://") ? imageUrl : undefined;
	return (
		<div className="inline-flex min-w-0 max-w-full shrink-0 flex-row items-center gap-1 text-muted-foreground text-xs">
			<span className="font-medium">by</span>
			{showName ? (
				<span className="truncate font-medium">{authorName}</span>
			) : null}
			{safeImageUrl ? (
				<Avatar
					size="sm"
					className="rounded-full outline-depth data-[size=sm]:size-5"
				>
					<AvatarImage
						src={safeImageUrl}
						alt={showName ? "" : `${authorName}'s profile`}
					/>
					<AvatarFallback>
						{authorName.slice(0, 1).toUpperCase()}
					</AvatarFallback>
				</Avatar>
			) : null}
		</div>
	);
}
