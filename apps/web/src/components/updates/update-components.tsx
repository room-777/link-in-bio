import { cn } from "@grabbin/ui/lib/utils";
import Image from "next/image";
import type { UpdateFrontmatter } from "@/lib/updates";

export function UpdateAuthor({
	author,
}: {
	author: UpdateFrontmatter["author"];
}) {
	return (
		<div className="flex flex-col items-center gap-2 text-center">
			<div className="size-10 rounded-full outline-depth">
				<Image
					src={author.image}
					alt=""
					width={40}
					height={40}
					loading="lazy"
					quality={65}
					sizes="40px"
					className="size-full rounded-full object-cover"
				/>
			</div>
			<div>
				<p className="font-medium text-sm leading-5">{author.name}</p>
				<p className="text-muted-foreground/80 text-sm leading-5">
					{author.title}
				</p>
			</div>
		</div>
	);
}

export function UpdateMedia({
	thumbnail,
	className = "",
	controls = false,
}: {
	thumbnail: UpdateFrontmatter["thumbnail"];
	className?: string;
	controls?: boolean;
}) {
	return thumbnail.type === "video" ? (
		<video
			className={cn(
				"aspect-video w-full rounded-md bg-secondary/50 object-cover",
				className,
			)}
			src={thumbnail.src}
			poster={thumbnail.poster}
			controls={controls}
			preload="none"
			aria-label={thumbnail.alt}
		>
			<track
				kind="captions"
				src={thumbnail.captions}
				srcLang="en"
				label="English"
				default
			/>
		</video>
	) : (
		<Image
			className={cn(
				"aspect-video w-full rounded-md bg-secondary/10 object-contain drop-shadow-sm",
				className,
			)}
			src={thumbnail.src}
			alt={thumbnail.alt}
			width={1600}
			height={900}
			loading="lazy"
			quality={80}
			sizes="(min-width: 80rem) 1200px, 100vw"
		/>
	);
}
