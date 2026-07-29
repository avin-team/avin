import { Separator } from "@avin/ui/components/separator";
import type { ComponentProps } from "react";

export const AuthDivider = ({ children, ...props }: ComponentProps<"div">) => (
  <div className="relative flex w-full items-center" {...props}>
    <Separator className="flex-1" />
    <div className="flex w-max justify-center text-nowrap px-2 text-muted-foreground text-xs">
      {children}
    </div>
    <Separator className="flex-1" />
  </div>
);
