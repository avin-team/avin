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
import { NotePencilIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";

import { useCorrectEnforcementReason } from "../api/seller-enforcement-api";
import type { SellerEnforcementReasonCode } from "../types";
import { REASON_CODE_LABELS } from "../workflow";

interface Props {
  readonly currentReason?: string;
  readonly currentReasonCode?: SellerEnforcementReasonCode;
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

export const ReasonCorrectionDialog = ({
  currentReason = "",
  currentReasonCode = "POLICY_VIOLATION",
  onOpenChange,
  open,
  sellerId,
}: Props) => {
  const [reasonCode, setReasonCode] =
    useState<SellerEnforcementReasonCode>(currentReasonCode);
  const [sellerReason, setSellerReason] = useState(currentReason);
  const [adminNote, setAdminNote] = useState("");

  const correctMutation = useCorrectEnforcementReason();

  const handleConfirm = async () => {
    const trimmedReason = sellerReason.trim();
    if (!trimmedReason) {
      toast.error("Vui lòng nhập lý do hiệu chỉnh gửi tới Seller.");
      return;
    }

    try {
      await correctMutation.mutateAsync({
        adminNote: adminNote.trim() || undefined,
        idempotencyKey: crypto.randomUUID(),
        reasonCode,
        sellerId,
        sellerReason: trimmedReason,
      });

      toast.success("Hiệu chỉnh lý do xử phạt thành công", {
        description:
          "Hệ thống đã ghi lại bản ghi hiệu chỉnh (Reason Corrected).",
      });
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Thao tác thất bại");
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <NotePencilIcon className="size-5" />
            <DialogTitle>
              Hiệu chỉnh lý do xử phạt (Reason Correction)
            </DialogTitle>
          </div>
          <DialogDescription>
            Cập nhật lại phân loại vi phạm và lý do gửi tới Seller mà không làm
            thay đổi trạng thái hiện tại.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 text-sm">
          <div className="grid gap-1.5">
            <Label htmlFor="correct-reason-code">Mã phân loại vi phạm</Label>
            <Select
              items={REASON_OPTIONS}
              onValueChange={(val) =>
                setReasonCode(val as SellerEnforcementReasonCode)
              }
              value={reasonCode}
            >
              <SelectTrigger id="correct-reason-code">
                <SelectValue placeholder="Chọn mã vi phạm" />
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

          <div className="grid gap-1.5">
            <Label htmlFor="correct-seller-reason">
              Lý do gửi tới Seller (Bắt buộc){" "}
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              disabled={correctMutation.isPending}
              id="correct-seller-reason"
              maxLength={2000}
              onChange={(e) => setSellerReason(e.target.value)}
              placeholder="Nhập lý do chính xác đã điều chỉnh..."
              rows={3}
              value={sellerReason}
            />
            <p className="text-xs text-muted-foreground text-end">
              {sellerReason.length}/2000 ký tự
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="correct-admin-note">
              Ghi chú nội bộ Admin (Tùy chọn)
            </Label>
            <Textarea
              disabled={correctMutation.isPending}
              id="correct-admin-note"
              maxLength={5000}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Ghi chú lý do cần hiệu chỉnh lại căn cứ xử phạt..."
              rows={2}
              value={adminNote}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button
            disabled={correctMutation.isPending}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Hủy
          </Button>
          <Button
            disabled={correctMutation.isPending}
            onClick={() => void handleConfirm()}
          >
            {correctMutation.isPending ? "Đang lưu..." : "Lưu hiệu chỉnh"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
