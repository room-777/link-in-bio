declare module "cuer" {
  import type { ComponentProps } from "react";

  export function Cuer(
    props: ComponentProps<"svg"> & {
      value: string;
      arena?: string;
    },
  ): JSX.Element;
}
