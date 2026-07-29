import { Badge } from "@avin/ui/components/badge";

import type { WithdrawalStatus } from "../types";

export function WithdrawalStatusBadge({
  status,
}: {
  readonly status: WithdrawalStatus;
}) {
  switch (status) {
    case "PENDING": {
      return (
        <Badge
          variant="secondary"
          className="bg-amber-100 text-amber-900 border-amber-300"
        >
          Pending
        </Badge>
      );
    }
    case "APPROVED": {
      return <Badge className="bg-blue-600 text-white">Approved</Badge>;
    }
    case "PAID": {
      return <Badge className="bg-emerald-600 text-white">Paid</Badge>;
    }
    case "REJECTED": {
      return <Badge variant="destructive">Rejected</Badge>;
    }
  }
}
