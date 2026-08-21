import {
  type ReactElement,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

export type MapViewportGateProps = {
  forceMount?: boolean;
  placeholder: ReactNode;
  children: ReactNode;
};

export function MapViewportGate({
  forceMount = false,
  placeholder,
  children,
}: MapViewportGateProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    if (hasMounted) return;

    if (forceMount) {
      setHasMounted(true);
      return;
    }

    const container = containerRef.current;
    if (!container || typeof IntersectionObserver === "undefined") {
      setHasMounted(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setHasMounted(true);
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(container);

    return () => observer.disconnect();
  }, [forceMount, hasMounted]);

  return (
    <div ref={containerRef} className="relative size-full min-h-0">
      {hasMounted ? children : placeholder}
    </div>
  );
}
