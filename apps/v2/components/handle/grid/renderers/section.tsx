import { useLayoutEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import type { ItemRendererProps } from "@/lib/grid/item-registry";
import type { GridItemByType } from "@/lib/grid/types";
import { cn } from "@/lib/utils";

export function SectionItemRenderer({
  item,
  mode,
  autoFocus = false,
  onAutoFocus,
  onCommand,
}: ItemRendererProps<GridItemByType<"section">>) {
  const isEditing = mode === "edit";
  const inputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    if (!isEditing || !autoFocus) return;
    inputRef.current?.focus({ preventScroll: true });
    onAutoFocus?.();
  }, [autoFocus, isEditing, onAutoFocus]);

  return (
    <div className="flex size-full items-center overflow-hidden p-3">
      {isEditing ? (
        <Input
          ref={inputRef}
          value={item.data.title}
          placeholder="Section title..."
          onChange={(event) =>
            onCommand?.({
              type: "update-data",
              itemId: item.id,
              data: { title: event.target.value },
            })
          }
          className={cn(
            "field-sizing-content h-full w-fit max-w-full min-w-48 rounded-lg border-0 bg-transparent px-2 py-0 text-xl! leading-11 font-semibold shadow-none placeholder:text-input",
            "hover:bg-muted focus-visible:bg-muted focus-visible:ring-0",
          )}
        />
      ) : (
        <p className="min-w-0 w-full line-clamp-1 truncate px-2 text-xl leading-11 font-semibold">
          {item.data.title}
        </p>
      )}
    </div>
  );
}
