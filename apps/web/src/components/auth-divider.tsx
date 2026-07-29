import { Separator } from "@avin/ui/components/separator";
import type React from "react";

export const AuthDivider = ({
  children,
  ...props
}: React.ComponentProps<"div">) => (
  <div className="relative flex w-full items-center" {...props}>
    <Separator />
    <div className="flex w-max justify-center text-nowrap px-2 text-muted-foreground text-xs">
      {children}
    </div>
    <Separator />
  </div>
);
