import { cn } from "@grabbin/ui/lib/utils";
import Image from "next/image";
import type { UpdateFrontmatter } from "@/lib/updates";

export default function UpdateMedia({
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
				"aspect-video w-full rounded-md bg-secondary/10 object-cover drop-shadow-sm",
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

export { UpdateMedia };
