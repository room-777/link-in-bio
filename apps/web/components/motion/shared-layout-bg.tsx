"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";
import {
  Children,
  isValidElement,
  type ReactNode,
  useId,
  useState,
} from "react";
import { cn } from "@/lib/utils";

const variants: Variants = {
  initial: { opacity: 0, filter: "blur(6px)" },
  animate: { opacity: 1, filter: "blur(0px)" },
  exit: (active: boolean) =>
    !active ? { opacity: 0, filter: "blur(6px)" } : {},
};

const reducedVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: (active: boolean) => (!active ? { opacity: 0 } : {}),
};

export function SharedLayoutBg({
  children,
  className,
  inset = 20,
}: {
  children: ReactNode;
  className?: string;
  inset?: number;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const id = useId();
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      layoutRoot
      onMouseLeave={() => setActiveId(null)}
      className={cn("flex w-full flex-col", className)}
    >
      {Children.toArray(children)
        .filter(isValidElement)
        .map((child, index) => {
          const key = child.key ? String(child.key) : `item-${index}`;
          return (
            <motion.div
              key={key}
              className="relative w-full"
              onHoverStart={() => setActiveId(key)}
            >
              <AnimatePresence custom={activeId !== null}>
                {activeId !== null ? (
                  <motion.div
                    variants={reduceMotion ? reducedVariants : variants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    custom={activeId !== null}
                    className="pointer-events-none absolute inset-y-0"
                    style={{ left: -inset, right: -inset }}
                  >
                    {activeId === key ? (
                      <motion.div
                        layoutId={`shared-bg-${id}`}
                        transition={
                          reduceMotion
                            ? { duration: 0 }
                            : {
                                type: "spring",
                                stiffness: 360,
                                damping: 32,
                                mass: 0.6,
                              }
                        }
                        className="pointer-events-none h-full w-full rounded-lg bg-primary/4"
                      />
                    ) : null}
                  </motion.div>
                ) : null}
              </AnimatePresence>
              <div className="relative z-10 flex flex-col items-start">
                {child}
              </div>
            </motion.div>
          );
        })}
    </motion.div>
  );
}
