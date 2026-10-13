import type { RssFeedResponse } from "@grabbin/api";
import {
	Item,
	ItemContent,
	ItemDescription,
	ItemSeparator,
	ItemTitle,
} from "@grabbin/ui/components/item";
import { Skeleton } from "@grabbin/ui/components/skeleton";

export default function RssArticle({
	item,
	isLast,
	isLoading = false,
}: {
	item?: RssFeedResponse["items"][number];
	isLast: boolean;
	isLoading?: boolean;
}) {
	return (
		<li>
			<Item
				variant="default"
				size="sm"
				render={
					item
						? (props) => (
								<a
									{...props}
									href={item.url}
									target="_blank"
									rel="noreferrer"
									aria-label={item.title}
								/>
							)
						: undefined
				}
				className="min-w-0 cursor-pointer! flex-nowrap justify-start whitespace-normal px-2 py-2 text-left"
			>
				<ItemContent className="min-w-0 gap-1">
					<ItemTitle
						className={`line-clamp-2 max-w-full whitespace-normal font-normal ${isLoading ? "w-full" : ""}`}
					>
						{isLoading ? (
							<Skeleton aria-hidden="true" className="h-5 w-3/4 rounded-sm" />
						) : (
							item?.title
						)}
					</ItemTitle>
					{isLoading ? (
						<ItemDescription className="text-xs">
							<Skeleton aria-hidden="true" className="h-4 w-1/3 rounded-sm" />
						</ItemDescription>
					) : item?.publishedAt ? (
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

export { RssArticle };
