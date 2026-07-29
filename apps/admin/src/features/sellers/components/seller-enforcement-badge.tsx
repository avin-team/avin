import { Badge } from "@avin/ui/components/badge";

import type { SellerEnforcementStatus } from "../types";

export const SellerEnforcementBadge = ({
  status,
}: {
  readonly status: SellerEnforcementStatus;
}) => {
  switch (status) {
    case "ACTIVE": {
      return (
        <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
          Hoạt động
        </Badge>
      );
    }
    case "SUSPENDED": {
      return (
        <Badge
          className="bg-amber-100 text-amber-900 border-amber-300"
          variant="secondary"
        >
          Tạm dừng
        </Badge>
      );
    }
    case "BANNED": {
      return <Badge variant="destructive">Đã cấm</Badge>;
    }
    default: {
      return null;
    }
  }
};
