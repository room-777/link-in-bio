import type { ReactNode } from "react";

export function ButtonContentTransition({
  idle,
  isPending,
  pending,
}: {
  idle: ReactNode;
  isPending: boolean;
  pending: ReactNode;
}) {
  return (
    <span
      className="t-button-content"
      data-state={isPending ? "pending" : "idle"}
    >
      <span
        className="t-button-content__item t-button-content__item--idle"
        aria-hidden={isPending}
      >
        {idle}
      </span>
      <span
        className="t-button-content__item t-button-content__item--pending"
        aria-hidden={!isPending}
      >
        {pending}
      </span>
    </span>
  );
}
