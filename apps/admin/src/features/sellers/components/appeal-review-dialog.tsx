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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avin/ui/components/select";
import { Textarea } from "@avin/ui/components/textarea";
import { ShieldCheckIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";

import { useReviewSellerAppeal } from "../api/seller-enforcement-api";
import type { EnforcementAppeal, SellerEnforcementReasonCode } from "../types";
import { REASON_CODE_LABELS } from "../workflow";

interface Props {
  readonly appeal: EnforcementAppeal | null;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
  readonly sellerId: string;
}

const REASON_OPTIONS: { label: string; value: SellerEnforcementReasonCode }[] =
  [
    { label: REASON_CODE_LABELS.POLICY_VIOLATION, value: "POLICY_VIOLATION" },
    { label: REASON_CODE_LABELS.FRAUD_RISK, value: "FRAUD_RISK" },
    { label: REASON_CODE_LABELS.FULFILLMENT_RISK, value: "FULFILLMENT_RISK" },
    { label: REASON_CODE_LABELS.FINANCIAL_RISK, value: "FINANCIAL_RISK" },
    { label: REASON_CODE_LABELS.OTHER, value: "OTHER" },
  ];

export const AppealReviewDialog = ({
  appeal,
  onOpenChange,
  open,
  sellerId,
}: Props) => {
  const [outcome, setOutcome] = useState<
    "UNDER_REVIEW" | "UPHELD" | "OVERTURNED"
  >("UNDER_REVIEW");
  const [reasonCode, setReasonCode] =
    useState<SellerEnforcementReasonCode>("POLICY_VIOLATION");
  const [outcomeReason, setOutcomeReason] = useState("");
  const [adminNote, setAdminNote] = useState("");

  const reviewMutation = useReviewSellerAppeal(sellerId);

  if (!appeal) {
    return null;
  }

  const handleConfirm = async () => {
    const trimmedOutcomeReason = outcomeReason.trim();
    if (outcome !== "UNDER_REVIEW" && !trimmedOutcomeReason) {
      toast.error("Vui lòng nhập lý do kết luận thẩm định khiếu nại.");
      return;
    }

    try {
      await reviewMutation.mutateAsync({
        adminNote: adminNote.trim() || undefined,
        appealId: appeal.id,
        outcome,
        outcomeReason: trimmedOutcomeReason || undefined,
        reasonCode,
      });

      toast.success(`Thẩm định khiếu nại thành công (${outcome})`, {
        description:
          outcome === "OVERTURNED"
            ? "Quyết định xử phạt đã được hủy và trạng thái Seller đã được khôi phục CLEAR."
            : "Đã cập nhật trạng thái khiếu nại.",
      });
      onOpenChange(false);
      setOutcomeReason("");
      setAdminNote("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Thao tác thất bại");
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheckIcon className="size-5" />
            <DialogTitle>Thẩm định đơn khiếu nại (Review Appeal)</DialogTitle>
          </div>
          <DialogDescription>
            Đưa ra kết luận thẩm định đối với đơn khiếu nại của Seller.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 text-sm">
          <div className="rounded-xl bg-muted/40 p-3 text-xs">
            <p className="font-semibold text-foreground">
              Giải trình của Seller:
            </p>
            <p className="mt-1 leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {appeal.sellerReason}
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="review-outcome">Quyết định thẩm định</Label>
            <Select
              items={[
                {
                  label: "Chuyển sang Đang thẩm định (Under Review)",
                  value: "UNDER_REVIEW",
                },
                {
                  label: "Bác bỏ khiếu nại - Giữ nguyên phạt (Upheld)",
                  value: "UPHELD",
                },
                {
                  label:
                    "Chấp thuận khiếu nại - Hủy phạt & Khôi phục CLEAR (Overturned)",
                  value: "OVERTURNED",
                },
              ]}
              onValueChange={(val) =>
                setOutcome(val as "UNDER_REVIEW" | "UPHELD" | "OVERTURNED")
              }
              value={outcome}
            >
              <SelectTrigger id="review-outcome">
                <SelectValue placeholder="Chọn kết luận thẩm định" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UNDER_REVIEW">
                  Đang thẩm định (Under Review)
                </SelectItem>
                <SelectItem value="UPHELD">
                  Bác bỏ khiếu nại - Giữ nguyên phạt (Upheld)
                </SelectItem>
                <SelectItem value="OVERTURNED">
                  Chấp thuận khiếu nại - Hủy phạt & Khôi phục (Overturned)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="review-reason-code">Mã phân loại kết luận</Label>
            <Select
              items={REASON_OPTIONS}
              onValueChange={(val) =>
                setReasonCode(val as SellerEnforcementReasonCode)
              }
              value={reasonCode}
            >
              <SelectTrigger id="review-reason-code">
                <SelectValue placeholder="Chọn mã phân loại" />
              </SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {outcome === "UNDER_REVIEW" ? null : (
            <div className="grid gap-1.5">
              <Label htmlFor="review-outcome-reason">
                Lý do kết luận (Bắt buộc, thông báo cho Seller){" "}
                <span className="text-destructive">*</span>
              </Label>
              <Textarea
                disabled={reviewMutation.isPending}
                id="review-outcome-reason"
                maxLength={2000}
                onChange={(e) => setOutcomeReason(e.target.value)}
                placeholder="Nhập lý do chi tiết căn cứ đưa ra kết luận chấp thuận hoặc bác bỏ..."
                rows={3}
                value={outcomeReason}
              />
              <p className="text-xs text-muted-foreground text-end">
                {outcomeReason.length}/2000 ký tự
              </p>
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="review-admin-note">
              Ghi chú nội bộ Admin (Tùy chọn)
            </Label>
            <Textarea
              disabled={reviewMutation.isPending}
              id="review-admin-note"
              maxLength={5000}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Ghi chú nội bộ quá trình thẩm định bằng chứng..."
              rows={2}
              value={adminNote}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button
            disabled={reviewMutation.isPending}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Hủy
          </Button>
          <Button
            disabled={reviewMutation.isPending}
            onClick={() => void handleConfirm()}
            variant={outcome === "UPHELD" ? "destructive" : "default"}
          >
            {reviewMutation.isPending ? "Đang lưu..." : "Xác nhận kết luận"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
