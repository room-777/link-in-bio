import type { UpdateFrontmatter } from "@/lib/updates";

export function UpdateAuthor({
	author,
}: {
	author: UpdateFrontmatter["author"];
}) {
	return (
		<div className="flex flex-col items-center gap-2 text-center">
			<div className="size-10 rounded-full outline-depth">
				<img
					src={author.image}
					alt=""
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
			className={`aspect-video w-full rounded-md bg-muted object-cover ${className}`}
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
		<img
			className={`aspect-video w-full rounded-md bg-muted object-cover ${className}`}
			src={thumbnail.src}
			alt={thumbnail.alt}
			loading="lazy"
		/>
	);
}
