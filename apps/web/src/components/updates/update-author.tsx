import Image from "next/image";
import type { UpdateFrontmatter } from "@/lib/updates";

export default function UpdateAuthor({
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

export { UpdateAuthor };
