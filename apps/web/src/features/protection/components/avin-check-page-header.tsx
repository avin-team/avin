import { Badge } from "@avin/ui/components/badge";
import { cn } from "@avin/ui/lib/utils";
import type { ReactNode } from "react";
import { useId } from "react";

export interface AvinCheckPageHeaderProps {
  actions?: ReactNode;
  badge?: ReactNode;
  children?: ReactNode;
  className?: string;
  description?: ReactNode;
  headingAs?: "h1" | "h2" | "h3";
  headingId?: string;
  title: ReactNode;
}

export const AvinCheckPageHeader = ({
  actions,
  badge,
  children,
  className,
  description,
  headingAs: HeadingTag = "h1",
  headingId,
  title,
}: AvinCheckPageHeaderProps) => {
  const generatedId = useId();
  const id = headingId ?? generatedId;

  return (
    <section
      aria-labelledby={id}
      className={cn("grid gap-6 border-b pb-8", className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          {badge ? (
            <Badge className="w-fit gap-1.5" variant="outline">
              {badge}
            </Badge>
          ) : null}
          <HeadingTag
            className="font-black text-4xl tracking-tight sm:text-5xl"
            id={id}
          >
            {title}
          </HeadingTag>
          {description ? (
            <p className="mt-1 max-w-2xl text-muted-foreground text-sm leading-6">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {children}
    </section>
  );
};
