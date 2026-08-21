import type { OwnedPageListResponse } from "@grabbin/api";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { SharedLayoutBg } from "@/components/motion/shared-layout-bg";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { createPublicImageUrl } from "@/lib/image/public-image-url";

type SwitchPageContentProps = {
  pages: OwnedPageListResponse["pages"];
  isPending: boolean;
  error: Error | null;
  imageBaseUrl?: string | null;
  onSelect: () => void;
};

export function SwitchPageContent({
  pages,
  isPending,
  error,
  imageBaseUrl,
  onSelect,
}: SwitchPageContentProps) {
  return (
    <div className="flex flex-col gap-1">
      {isPending ? (
        <div className="flex flex-col gap-1" aria-busy="true">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="flex h-15 flex-col justify-center gap-2 px-2"
            >
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="px-2 py-3 text-sm text-destructive" role="alert">
          Could not load pages.
        </p>
      ) : pages.length ? (
        <SharedLayoutBg className="" inset={0}>
          {pages.map((candidate) => (
            <Link
              key={candidate.id}
              href={`/${encodeURIComponent(candidate.handle)}`}
              onClick={onSelect}
              className="flex min-h-15 w-full items-center gap-2 rounded-lg text-left font-medium px-2"
            >
              <Avatar size="default" className="size-9">
                <AvatarImage
                  src={
                    createPublicImageUrl(
                      candidate.image,
                      candidate.updatedAt,
                      imageBaseUrl,
                    ) ?? undefined
                  }
                  alt=""
                />
                <AvatarFallback />
              </Avatar>
              <span className="flex min-w-0 flex-col">
                <span className="truncate">
                  {candidate.name ?? candidate.handle}
                </span>
                <span className="text-muted-foreground/80">
                  /{candidate.handle}
                </span>
              </span>
            </Link>
          ))}
          <Link
            href="/new"
            onClick={onSelect}
            className="flex min-h-15 w-full! justify-between items-center gap-2 rounded-lg font-medium px-2"
          >
            <span>Create page</span>
            <PlusIcon className="size-4" aria-hidden="true" />
          </Link>
        </SharedLayoutBg>
      ) : (
        <p className="px-2 py-3 text-sm text-muted-foreground">No pages yet.</p>
      )}
    </div>
  );
}
