import { Badge } from "@avin/ui/components/badge";

import { getListingStatusLabel } from "../workflow";
import type { ListingStatus } from "../workflow";

const STATUS_VARIANTS: Record<
  ListingStatus,
  "default" | "destructive" | "outline" | "secondary"
> = {
  ARCHIVED: "secondary",
  DRAFT: "outline",
  HIDDEN: "destructive",
  PAUSED: "secondary",
  PUBLISHED: "default",
};

export const ListingStatusBadge = ({
  status,
}: {
  readonly status: ListingStatus;
}) => (
  <Badge variant={STATUS_VARIANTS[status]}>
    {getListingStatusLabel(status)}
  </Badge>
);
