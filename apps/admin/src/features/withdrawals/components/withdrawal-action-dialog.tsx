import { Button } from "@avin/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@avin/ui/components/dialog";
import { Input } from "@avin/ui/components/input";
import { Label } from "@avin/ui/components/label";
import { Textarea } from "@avin/ui/components/textarea";
import { useState } from "react";
import { toast } from "sonner";

import { processWithdrawalAction } from "../api/mock-withdrawals";
import type { WithdrawalRequest, WithdrawalStatus } from "../types";

interface Props {
  readonly request: WithdrawalRequest | null;
  readonly targetStatus: WithdrawalStatus | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export const WithdrawalActionDialog = ({
  request,
  targetStatus,
  open,
  onOpenChange,
}: Props) => {
  const [bankRef, setBankRef] = useState("");
  const [note, setNote] = useState("");

  if (!request || !targetStatus) {
    return null;
  }

  const handleConfirm = () => {
    try {
      processWithdrawalAction(request.id, targetStatus, bankRef, note);
      toast.success(`Cập nhật thành công yêu cầu rút tiền (${targetStatus})`, {
        description: `Thực hiện cho storefront ${request.storefrontName}`,
      });
      onOpenChange(false);
      setBankRef("");
      setNote("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Thao tác thất bại");
    }
  };

  const renderTitle = () => {
    if (targetStatus === "APPROVED") {
      return "Duyệt Yêu Cầu Rút Tiền";
    }
    if (targetStatus === "PAID") {
      return "Xác Nhận Đã Chuyển Khoản (Paid)";
    }
    return "Từ Chối Yêu Cầu Rút Tiền";
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{renderTitle()}</DialogTitle>
          <DialogDescription>
            Rút tiền số lượng:{" "}
            <strong>{request.amountVnd.toLocaleString("vi-VN")} đ</strong> về
            tài khoản ngân hàng của <strong>{request.storefrontName}</strong> (
            {request.bankAccount.bankName} - {request.bankAccount.accountNumber}
            ).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {targetStatus === "PAID" && (
            <div className="grid gap-2">
              <Label htmlFor="bank-ref">
                Mã giao dịch ngân hàng / VietQR Ref (Bắt buộc)
              </Label>
              <Input
                id="bank-ref"
                onChange={(e) => setBankRef(e.target.value)}
                placeholder="VD: FT26219901"
                required
                value={bankRef}
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="wth-note">
              Ghi chú nội bộ / Lý do từ chối{" "}
              {targetStatus === "REJECTED" ? "(Bắt buộc)" : "(Tùy chọn)"}
            </Label>
            <Textarea
              id="wth-note"
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập chi tiết ghi chú hoặc lý do..."
              rows={3}
              value={note}
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
            variant={targetStatus === "REJECTED" ? "destructive" : "default"}
          >
            Xác nhận {targetStatus}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
