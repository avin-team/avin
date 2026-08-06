import { PackageIcon } from "@phosphor-icons/react";

export interface ListingEmptyStateProps {
  description?: string;
  title?: string;
}

export const ListingEmptyState = ({
  title = "No published listings found",
  description = "There are currently no active listings in this section.",
}: ListingEmptyStateProps) => (
  <div className="rounded-2xl border border-border bg-card p-12 text-center">
    <PackageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
    <h3 className="mt-4 text-lg font-bold text-foreground">{title}</h3>
    <p className="mt-2 text-sm text-muted-foreground">{description}</p>
  </div>
);
