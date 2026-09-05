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
      className={cn(
        "rounded-[2rem] border border-primary/20 bg-linear-to-br from-primary/10 via-card to-card p-6 shadow-xs sm:p-8",
        className
      )}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          {badge ? (
            <Badge className="w-fit gap-1.5" variant="outline">
              {badge}
            </Badge>
          ) : null}
          <HeadingTag
            className="font-black text-3xl tracking-tight sm:text-4xl"
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
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
      {children}
    </section>
  );
};
