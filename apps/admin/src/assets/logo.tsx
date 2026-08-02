import { cn } from "@avin/ui/lib/utils";
import type { ImgHTMLAttributes } from "react";

export function Logo({
  className,
  alt = "Avin Logo",
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      alt={alt}
      className={cn("size-6 rounded-lg object-cover", className)}
      src="/logo.png"
      {...props}
    />
  );
}
