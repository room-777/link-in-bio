import { useLayoutEffect, useRef } from "react";
import { ItemExternalAction } from "@/components/handle/grid/item-external-action";
import type { ItemRendererProps } from "@/lib/grid/item-registry";
import type { GridItemByType } from "@/lib/grid/types";
import { cn } from "@/lib/utils";

type TextAlign = "left" | "center" | "right";
type VerticalAlign = "top" | "center" | "bottom";

const textAlignValues = ["left", "center", "right"] as const;
const verticalAlignValues = ["top", "center", "bottom"] as const;

function getTextStyleValue<T extends string>(
  style: Record<string, string | number | boolean | null>,
  key: string,
  values: readonly T[],
  fallback: T,
): T {
  const value = style[key];
  return typeof value === "string" && values.includes(value as T)
    ? (value as T)
    : fallback;
}

const verticalAlignClassByValue: Record<VerticalAlign, string> = {
  top: "justify-start",
  center: "justify-center",
  bottom: "justify-end",
};

function syncTextareaVerticalAlign(
  textarea: HTMLTextAreaElement,
  verticalAlign: VerticalAlign,
) {
  const computedStyle = window.getComputedStyle(textarea);
  const basePadding = Number.parseFloat(computedStyle.paddingBottom);

  textarea.style.paddingTop = `${basePadding}px`;
  if (verticalAlign === "top") return;

  const contentHeight = textarea.scrollHeight - basePadding * 2;
  const availableHeight =
    textarea.clientHeight - basePadding * 2 - contentHeight;
  const extraPadding =
    Math.max(0, availableHeight) * (verticalAlign === "center" ? 0.5 : 1);

  textarea.style.paddingTop = `${basePadding + extraPadding}px`;
}

const textSizeClassByPreset = {
  fullBanner: "text-lg font-medium leading-7",
  halfBanner: "text-lg font-medium leading-8.5",
  squareSmall: "text-lg font-medium leading-7",
  landscape: "text-lg font-medium leading-7",
  squareLarge: "text-lg font-medium leading-8",
  portrait: "text-lg font-medium leading-8",
} as const;

const textContentClassName =
  "min-h-0 min-w-0 flex-1 rounded-lg bg-transparent p-1 px-2 text-foreground/90 outline-none";

export function TextItemRenderer({
  item,
  mode,
  preset,
  autoFocus = false,
  onAutoFocus,
  onCommand,
}: ItemRendererProps<GridItemByType<"text">>) {
  const isEditing = mode === "edit";
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textAlign = getTextStyleValue<TextAlign>(
    item.style,
    "textAlign",
    textAlignValues,
    "left",
  );
  const verticalAlign = getTextStyleValue<VerticalAlign>(
    item.style,
    "verticalAlign",
    verticalAlignValues,
    "top",
  );

  useLayoutEffect(() => {
    if (!isEditing) return;
    const textarea = textareaRef.current;
    if (!textarea) return;

    const updateTextareaPadding = () => {
      syncTextareaVerticalAlign(textarea, verticalAlign);
    };

    updateTextareaPadding();
    const resizeObserver = new ResizeObserver(updateTextareaPadding);
    resizeObserver.observe(textarea);

    return () => resizeObserver.disconnect();
  }, [isEditing, verticalAlign]);

  useLayoutEffect(() => {
    if (!isEditing || !autoFocus) return;
    textareaRef.current?.focus({ preventScroll: true });
    onAutoFocus?.();
  }, [autoFocus, isEditing, onAutoFocus]);

  return (
    <div className="relative flex size-full min-h-0 flex-col gap-3 p-3">
      <div className="flex min-h-0 flex-1 items-stretch justify-between gap-3">
        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col",
            verticalAlignClassByValue[verticalAlign],
          )}
        >
          {isEditing ? (
            <textarea
              ref={textareaRef}
              placeholder="Add note..."
              spellCheck={false}
              value={item.data.text}
              onBlur={(event) => {
                event.currentTarget.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onChange={(event) =>
                onCommand?.({
                  type: "update-data",
                  itemId: item.id,
                  data: {
                    ...item.data,
                    text: event.target.value,
                  },
                })
              }
              className={cn(
                textContentClassName,
                "resize-none whitespace-pre-wrap",
                textSizeClassByPreset[preset],
                "h-full overflow-y-auto placeholder:text-input hover:bg-muted focus-visible:bg-muted",
              )}
              style={{ textAlign }}
            />
          ) : (
            <div
              className={cn(
                textContentClassName,
                "no-scrollbar overflow-y-auto whitespace-pre-wrap",
                textSizeClassByPreset[preset],
              )}
              style={{ textAlign }}
            >
              {item.data.text}
            </div>
          )}
        </div>
      </div>
      {item.data.link ? (
        <div className="absolute right-4 bottom-4 flex h-fit items-center">
          <ItemExternalAction
            href={item.data.link}
            ariaLabel="Open text link"
          />
        </div>
      ) : null}
    </div>
  );
}
