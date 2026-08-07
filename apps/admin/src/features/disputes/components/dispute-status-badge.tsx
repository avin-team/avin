import { Badge } from "@avin/ui/components/badge";

import type { DisputeStatus } from "../types";

export const DisputeStatusBadge = ({
  status,
}: {
  readonly status: DisputeStatus;
}) => {
  switch (status) {
    case "OPEN": {
      return (
        <Badge
          className="bg-amber-100 text-amber-900 border-amber-300"
          variant="secondary"
        >
          Mới mở
        </Badge>
      );
    }
    case "UNDER_REVIEW": {
      return <Badge className="bg-blue-600 text-white">Admin xem xét</Badge>;
    }
    case "CANCELLED": {
      return <Badge variant="outline">Buyer đã hủy</Badge>;
    }
    case "RESOLVED_REFUNDED": {
      return <Badge className="bg-purple-600 text-white">Đã hoàn tiền</Badge>;
    }
    case "RESOLVED_RELEASED": {
      return <Badge className="bg-emerald-600 text-white">Đã giải ngân</Badge>;
    }
    default: {
      return null;
    }
  }
};
