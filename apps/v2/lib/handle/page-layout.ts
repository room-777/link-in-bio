export type Breakpoint = "wide" | "compact";

export type PageLayoutClasses = {
  shell: string;
  profile: string;
  content: string;
  profileAside: string;
  profileDetails: string;
  controls: string;
  name: string;
  bio: string;
  image: string;
  imageCrop: string;
  imageRemove: string;
};

const pageLayoutClasses: Record<Breakpoint, PageLayoutClasses> = {
  wide: {
    shell:
      "min-[90rem]:flex-row min-[90rem]:items-stretch min-[90rem]:justify-around",
    profile: "min-[90rem]:min-h-0 min-[90rem]:w-2xl min-[90rem]:max-w-none",
    content:
      "min-[90rem]:h-full min-[90rem]:min-h-[calc(100dvh-4rem)] min-[90rem]:w-4xl min-[90rem]:max-w-none min-[90rem]:shrink-0 min-[90rem]:pt-16",
    profileAside:
      "min-[90rem]:sticky min-[90rem]:top-0 min-[90rem]:min-h-dvh min-[90rem]:self-start min-[90rem]:flex-none min-[90rem]:pt-16",
    profileDetails: "min-[90rem]:px-2",
    controls:
      "min-[90rem]:fixed min-[90rem]:bottom-10 min-[90rem]:left-6 min-[90rem]:flex min-[90rem]:px-6",
    name: "min-[90rem]:text-[40px]",
    bio: "min-[90rem]:text-xl min-[90rem]:leading-8",
    image: "sm:size-32 min-[90rem]:size-46",
    imageCrop: "min-[90rem]:top-2 min-[90rem]:left-2",
    imageRemove: "min-[90rem]:top-2 min-[90rem]:right-2",
  },
  compact: {
    shell: "min-[90rem]:items-center min-[90rem]:justify-start",
    profile: "min-[90rem]:max-w-lg",
    content:
      "min-[90rem]:h-auto min-[90rem]:min-h-0 min-[90rem]:max-w-lg min-[90rem]:shrink-0 min-[90rem]:pt-0",
    profileAside: "",
    profileDetails: "",
    controls:
      "min-[90rem]:fixed min-[90rem]:bottom-10 min-[90rem]:left-6 min-[90rem]:flex min-[90rem]:px-6",
    name: "",
    bio: "",
    image: "",
    imageCrop: "",
    imageRemove: "",
  },
};

export function getPageLayoutClasses(
  breakpoint: Breakpoint,
): PageLayoutClasses {
  return pageLayoutClasses[breakpoint];
}
