import { Badge } from "@avin/ui/components/badge";

import type { WithdrawalStatus } from "../types";

export const WithdrawalStatusBadge = ({
  status,
}: {
  readonly status: WithdrawalStatus;
}) => {
  switch (status) {
    case "PENDING": {
      return (
        <Badge
          className="bg-amber-100 text-amber-900 border-amber-300"
          variant="secondary"
        >
          Chờ duyệt
        </Badge>
      );
    }
    case "APPROVED": {
      return <Badge className="bg-blue-600 text-white">Đã duyệt</Badge>;
    }
    case "PAID": {
      return <Badge className="bg-emerald-600 text-white">Đã CK</Badge>;
    }
    case "REJECTED": {
      return <Badge variant="destructive">Từ chối</Badge>;
    }
    default: {
      return null;
    }
  }
};
