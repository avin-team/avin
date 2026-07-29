import { Badge } from "@avin/ui/components/badge";

import type { DisputeStatus } from "../types";

export function DisputeStatusBadge({
  status,
}: {
  readonly status: DisputeStatus;
}) {
  switch (status) {
    case "OPEN": {
      return (
        <Badge
          variant="secondary"
          className="bg-amber-100 text-amber-900 border-amber-300"
        >
          Open
        </Badge>
      );
    }
    case "UNDER_REVIEW": {
      return <Badge className="bg-blue-600 text-white">Under Review</Badge>;
    }
    case "RESOLVED_REFUNDED": {
      return (
        <Badge className="bg-purple-600 text-white">Resolved (Refunded)</Badge>
      );
    }
    case "RESOLVED_RELEASED": {
      return (
        <Badge className="bg-emerald-600 text-white">Resolved (Released)</Badge>
      );
    }
  }
}
