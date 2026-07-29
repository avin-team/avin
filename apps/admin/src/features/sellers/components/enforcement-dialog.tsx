import { Button } from "@avin/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@avin/ui/components/dialog";
import { Label } from "@avin/ui/components/label";
import { Textarea } from "@avin/ui/components/textarea";
import { useState } from "react";
import { toast } from "sonner";

import { updateSellerEnforcement } from "../api/mock-sellers";
import type { Seller, SellerEnforcementStatus } from "../types";

interface Props {
  readonly seller: Seller | null;
  readonly targetStatus: SellerEnforcementStatus | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function EnforcementDialog({
  seller,
  targetStatus,
  open,
  onOpenChange,
}: Props) {
  const [reason, setReason] = useState("");

  if (!seller || !targetStatus) {
    return null;
  }

  const handleConfirm = () => {
    try {
      updateSellerEnforcement(seller.id, targetStatus, reason);
      toast.success(`Cập nhật trạng thái Seller thành công (${targetStatus})`, {
        description: `Đã xử lý cho ${seller.storefrontName}`,
      });
      onOpenChange(false);
      setReason("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Thao tác thất bại");
    }
  };

  const isDestructive =
    targetStatus === "BANNED" || targetStatus === "SUSPENDED";

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {targetStatus === "ACTIVE"
              ? "Khôi phục trạng thái Hoạt Động"
              : (targetStatus === "SUSPENDED"
                ? "Tạm dừng hoạt động Seller (Suspend)"
                : "Cấm vĩnh viễn Seller (Ban)")}
          </DialogTitle>
          <DialogDescription>
            Thực hiện trên storefront <strong>{seller.storefrontName}</strong>.
            Thao tác này sẽ ghi lại nhật ký xử lý vi phạm.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="reason">Lý do xử lý vi phạm (Bắt buộc)</Label>
            <Textarea
              id="reason"
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nhập chi tiết lý do hoặc mã quy định vi phạm..."
              rows={4}
              value={reason}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Hủy
          </Button>
          <Button
            onClick={handleConfirm}
            variant={isDestructive ? "destructive" : "default"}
          >
            Xác nhận {targetStatus}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
