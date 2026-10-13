import { Input } from "@grabbin/ui/components/input";

const mediaCaptionClassName =
	"field-sizing-content h-8 w-fit min-w-24 max-w-full rounded-md bg-background px-2 py-0 font-medium text-foreground text-sm outline-solid! outline-1! outline-black/10!";

export function MediaCaption({
	value,
	mode = "view",
	className,
	onChange,
}: {
	value: string | undefined;
	mode?: "view" | "edit";
	className?: string;
	onChange?: (value: string) => void;
}) {
	const caption = value?.trim();
	if (mode === "edit") {
		return (
			<Input
				data-bro-ignore="true"
				value={value ?? ""}
				placeholder="Caption"
				aria-label="Media caption"
				className={`pointer-events-auto truncate ${mediaCaptionClassName} ${className ?? ""}`}
				onChange={(event) => onChange?.(event.target.value)}
			/>
		);
	}
	return caption ? (
		<p
			className={`${mediaCaptionClassName} flex items-center ${className ?? ""}`}
		>
			<span className="block min-w-0 flex-1 truncate">{caption}</span>
		</p>
	) : null;
}
