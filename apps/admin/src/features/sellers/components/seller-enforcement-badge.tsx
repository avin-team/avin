import { Badge } from "@avin/ui/components/badge";

import type { SellerEnforcementStatus } from "../types";

export function SellerEnforcementBadge({
  status,
}: {
  readonly status: SellerEnforcementStatus;
}) {
  switch (status) {
    case "ACTIVE": {
      return (
        <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
          Active
        </Badge>
      );
    }
    case "SUSPENDED": {
      return (
        <Badge
          variant="secondary"
          className="bg-amber-100 text-amber-900 border-amber-300"
        >
          Suspended
        </Badge>
      );
    }
    case "BANNED": {
      return <Badge variant="destructive">Banned</Badge>;
    }
  }
}
