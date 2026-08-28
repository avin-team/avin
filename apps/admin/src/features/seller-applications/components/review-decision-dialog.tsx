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
import { Spinner } from "@avin/ui/components/spinner";
import { Textarea } from "@avin/ui/components/textarea";
import { useState } from "react";

import type { SellerApplicationDecision } from "../types";

interface ReviewDecisionDialogProps {
  readonly decision: SellerApplicationDecision | null;
  readonly isPending?: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onConfirm: (reason?: string) => void;
}

const DECISION_COPY: Record<
  Exclude<SellerApplicationDecision, "PENDING_REVIEW">,
  { description: string; title: string }
> = {
  APPROVED: {
    description:
      "Seller có thể mở gian hàng và đăng bán sản phẩm sau khi phê duyệt.",
    title: "Phê duyệt hồ sơ đăng ký?",
  },
  CHANGES_REQUESTED: {
    description:
      "Người đăng ký sẽ thấy lý do này và có thể chỉnh sửa lại hồ sơ để gửi duyệt lại.",
    title: "Yêu cầu chỉnh sửa thông tin",
  },
  REJECTED: {
    description:
      "Từ chối dành riêng cho trường hợp gian lận hoặc không đáp ứng tiêu chuẩn sàn.",
    title: "Từ chối hồ sơ đăng ký?",
  },
};

export const ReviewDecisionDialog = ({
  decision,
  isPending = false,
  onOpenChange,
  onConfirm,
}: ReviewDecisionDialogProps) => {
  const [reason, setReason] = useState("");
  const requiresReason = decision !== null && decision !== "APPROVED";

  if (!decision) {
    return null;
  }

  const copy = DECISION_COPY[decision];

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          setReason("");
        }
        onOpenChange(open);
      }}
      open={Boolean(decision)}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        {requiresReason && (
          <div className="grid gap-2 py-2">
            <Label htmlFor="review-reason">Lý do (Bắt buộc)</Label>
            <Textarea
              disabled={isPending}
              id="review-reason"
              onChange={(event) => setReason(event.target.value)}
              placeholder="Giải thích chi tiết những thông tin cần bổ sung hoặc lý do từ chối..."
              rows={3}
              value={reason}
            />
          </div>
        )}
        <DialogFooter>
          <Button
            disabled={isPending}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Hủy
          </Button>
          <Button
            disabled={
              isPending || (requiresReason && reason.trim().length === 0)
            }
            onClick={() => {
              onConfirm(requiresReason ? reason : undefined);
            }}
            variant={decision === "REJECTED" ? "destructive" : "default"}
          >
            {isPending && <Spinner data-icon="inline-start" />}
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
