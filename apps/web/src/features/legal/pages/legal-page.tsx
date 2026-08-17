import type { ReactNode } from "react";

import { Shell } from "@/components/shell";

export const LegalPage = ({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) => (
  <Shell variant="default">
    <article className="mx-auto w-full max-w-3xl space-y-6 py-8 sm:py-12">
      <header className="space-y-2 border-b pb-6">
        <p className="font-semibold text-primary text-sm">Avin</p>
        <h1 className="font-black text-3xl tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </header>
      <div className="space-y-4 text-muted-foreground text-sm leading-7">
        {children}
      </div>
    </article>
  </Shell>
);
