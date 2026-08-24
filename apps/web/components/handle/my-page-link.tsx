"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getMyPage, myPageQueryKey } from "@/lib/client/page-api";
import { createPublicImageUrl } from "@/lib/image/public-image-url";

export function MyPageLink({
  enabled,
  imageBaseUrl,
}: {
  enabled: boolean;
  imageBaseUrl?: string | null;
}) {
  const { data, isPending } = useQuery({
    queryKey: myPageQueryKey,
    queryFn: getMyPage,
    enabled,
    refetchOnMount: true,
    throwOnError: false,
  });
  if (enabled && isPending) {
    return <Skeleton aria-busy="true" className="h-7 w-22 px-3 rounded-sm" />;
  }
  const page = data?.page;
  if (!page) return null;

  const imageUrl = createPublicImageUrl(
    page.image,
    page.updatedAt,
    imageBaseUrl,
  );

  return (
    <Button
      nativeButton={false}
      render={<Link href={`/${encodeURIComponent(page.handle)}`} />}
      variant="ghost"
      size="sm"
      className="gap-1.5 rounded-md"
    >
      <Avatar size="xs">
        <AvatarImage src={imageUrl ?? undefined} alt="" />
        <AvatarFallback />
      </Avatar>
      {page.name}
    </Button>
  );
}
