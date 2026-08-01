import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { StoreSection } from "../data/store-mock-data";

interface StoreSectionPlaceholderProps {
  active: StoreSection;
  description: string;
  icon: LucideIcon;
  title: string;
}

export const StoreSectionPlaceholder = ({
  active,
  description,
  icon: Icon,
  title,
}: StoreSectionPlaceholderProps) => (
  <section className="rounded-2xl border border-border bg-card p-8">
    <div className="flex items-center gap-3">
      <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Badge variant="outline">Mock UI</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Khu vực: {active}</p>
      </div>
    </div>
    <p className="mt-6 max-w-2xl text-sm leading-6 text-muted-foreground">
      {description}
    </p>
    <Button className="mt-6" variant="outline">
      Thiết lập {title.toLowerCase()}
      <ArrowRight />
    </Button>
  </section>
);
