import { Input } from "@/components/ui/input";
import type { PageMode } from "@/lib/page/page-mode";

const captionClassName =
  "field-sizing-content h-7.5 w-fit max-w-full rounded-md bg-white/80 border border-border backdrop-blur-sm px-2 py-0 text-sm font-medium text-foreground placeholder:text-gray-bright/60";

export function ItemCaption({
  mode,
  value,
  onChange,
}: {
  mode: PageMode;
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  if (mode === "edit") {
    return (
      <Input
        // Prevent password-manager content scripts from mutating SSR markup before hydration.
        data-bro-ignore="true"
        value={value ?? ""}
        placeholder="Caption"
        onChange={(event) => onChange(event.target.value)}
        className={`pointer-events-auto min-w-24 truncate ${captionClassName}`}
      />
    );
  }

  const caption = value?.trim();
  return caption ? (
    <p className={`${captionClassName} min-w-0 flex items-center`}>
      <span className="block min-w-0 flex-1 truncate">{caption}</span>
    </p>
  ) : null;
}
