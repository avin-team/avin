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

import { resolveDisputeAction } from "../api/mock-disputes";
import type { Dispute, DisputeResolutionOutcome } from "../types";

interface Props {
  readonly dispute: Dispute | null;
  readonly outcome: DisputeResolutionOutcome | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export const DisputeResolutionDialog = ({
  dispute,
  outcome,
  open,
  onOpenChange,
}: Props) => {
  const [note, setNote] = useState("");
  const [chatMsg, setChatMsg] = useState("");

  if (!dispute || !outcome) {
    return null;
  }

  const isRefund = outcome === "RESOLVED_REFUNDED";

  const handleConfirm = () => {
    try {
      resolveDisputeAction(dispute.id, outcome, note, chatMsg);
      toast.success(
        isRefund
          ? "Đã đưa ra quyết định Hoàn tiền 100% cho Buyer"
          : "Đã đưa ra quyết định Giải ngân 100% cho Seller",
        {
          description: `Mã đơn: ${dispute.itemSnapshot.orderId}`,
        }
      );
      onOpenChange(false);
      setNote("");
      setChatMsg("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Thao tác thất bại");
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isRefund
              ? "Quyết định HOÀN TIỀN (Full Refund to Buyer)"
              : "Quyết định GIẢI NGÂN (Full Escrow Release to Seller)"}
          </DialogTitle>
          <DialogDescription>
            {isRefund
              ? `Hoàn lại 100% số tiền ${dispute.itemSnapshot.totalAmountVnd.toLocaleString("vi-VN")} đ từ EscrowHold về ví Buyer (${dispute.buyerName}).`
              : `Giải ngân 100% số tiền ${dispute.itemSnapshot.totalAmountVnd.toLocaleString("vi-VN")} đ (trừ chiết khấu sàn) về ví Seller (${dispute.sellerStorefrontName}).`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="note">
              Ghi chú quyết định của Admin (Bắt buộc cho Hồ sơ Audit)
            </Label>
            <Textarea
              id="note"
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi rõ lý do căn cứ theo chứng cứ hai bên cung cấp..."
              rows={3}
              value={note}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="chat-msg">
              Tin nhắn phân giải công khai gửi vào chat Đơn Hàng (Tùy chọn)
            </Label>
            <Textarea
              id="chat-msg"
              onChange={(e) => setChatMsg(e.target.value)}
              placeholder="VD: Admin đã kiểm tra chứng cứ và quyết định hoàn tiền..."
              rows={2}
              value={chatMsg}
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
            variant={isRefund ? "destructive" : "default"}
          >
            Xác nhận {isRefund ? "Hoàn Tiền" : "Giải Ngân"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
