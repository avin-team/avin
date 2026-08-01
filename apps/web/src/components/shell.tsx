import { cn } from "@avin/ui/lib/utils";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import type * as React from "react";

const shellVariants = cva("grid items-center gap-6 pt-8 pb-16", {
  defaultVariants: {
    variant: "default",
  },
  variants: {
    variant: {
      centered:
        "container mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col justify-center px-4",
      default: "container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8",
    },
  },
});

export interface ShellProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof shellVariants> {
  as?: React.ElementType;
}

export const Shell = ({
  as: Comp = "main",
  className,
  variant,
  ...props
}: ShellProps) => (
  <Comp className={cn(shellVariants({ variant }), className)} {...props} />
);
