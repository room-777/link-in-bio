import {
  createContext,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Breakpoint } from "@/lib/grid/types";

type MediaCropActions = {
  breakpoint: Breakpoint;
  canApply: boolean;
  onOpen(): void;
  onCancel(): void;
  onApply(): void;
};

type MediaCropInteractionContextValue = {
  isOpen: boolean;
  isDragging: boolean;
  canApply: boolean;
  breakpoint: Breakpoint | null;
  open(): void;
  cancel(): void;
  apply(): void;
  setDragging(isDragging: boolean): void;
  registerActions(actions: MediaCropActions): () => void;
};

const MediaCropInteractionContext =
  createContext<MediaCropInteractionContextValue | null>(null);

export function MediaCropInteractionProvider({
  children,
  containerRef,
}: {
  children: ReactNode;
  containerRef: RefObject<HTMLElement | null>;
}): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [canApply, setCanApply] = useState(false);
  const [breakpoint, setBreakpoint] = useState<Breakpoint | null>(null);
  const actionsRef = useRef<MediaCropActions | null>(null);

  const registerActions = useCallback((actions: MediaCropActions) => {
    actionsRef.current = actions;
    setCanApply(actions.canApply);
    setBreakpoint(actions.breakpoint);

    return () => {
      if (actionsRef.current !== actions) return;
      actionsRef.current = null;
      setCanApply(false);
      setBreakpoint(null);
    };
  }, []);

  const open = useCallback(() => {
    actionsRef.current?.onOpen();
    setIsOpen(true);
  }, []);
  const cancel = useCallback(() => {
    actionsRef.current?.onCancel();
    setIsOpen(false);
    setIsDragging(false);
  }, []);
  const apply = useCallback(() => {
    const actions = actionsRef.current;
    if (!actions?.canApply) return;
    actions.onApply();
    setIsOpen(false);
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      cancel();
    }

    function handleOutsidePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        containerRef.current?.contains(event.target)
      )
        return;
      cancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handleOutsidePointerDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener(
        "pointerdown",
        handleOutsidePointerDown,
        true,
      );
    };
  }, [cancel, containerRef, isOpen]);

  const value = useMemo(
    () => ({
      isOpen,
      isDragging,
      canApply,
      breakpoint,
      open,
      cancel,
      apply,
      setDragging: setIsDragging,
      registerActions,
    }),
    [
      apply,
      breakpoint,
      canApply,
      cancel,
      isDragging,
      isOpen,
      open,
      registerActions,
    ],
  );

  return (
    <MediaCropInteractionContext.Provider value={value}>
      {children}
    </MediaCropInteractionContext.Provider>
  );
}

export function useOptionalMediaCropInteraction() {
  return useContext(MediaCropInteractionContext);
}

export function useMediaCropInteraction(): MediaCropInteractionContextValue {
  const context = useOptionalMediaCropInteraction();
  if (!context) {
    throw new Error(
      "useMediaCropInteraction must be used inside MediaCropInteractionProvider",
    );
  }
  return context;
}
