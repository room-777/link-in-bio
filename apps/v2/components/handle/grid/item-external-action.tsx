import { CircleArrowRightUp } from "reicon-react";

type ItemExternalActionProps = {
  href: string;
  ariaLabel: string;
};

export function ItemExternalAction({
  href,
  ariaLabel,
}: ItemExternalActionProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={ariaLabel}
      className="group cursor-pointer! inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-white/60 text-xs font-medium text-white transition-colors hover:bg-white"
    >
      <CircleArrowRightUp
        size={28}
        weight="Filled"
        className="text-black/60! group-hover:text-black!"
      />
    </a>
  );
}
