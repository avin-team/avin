import { Button } from "@avin/ui/components/button";
import { Checkbox } from "@avin/ui/components/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avin/ui/components/select";
import { Textarea } from "@avin/ui/components/textarea";
import { ProhibitIcon, ShieldWarningIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";

import { updateSellerEnforcement } from "../api/mock-sellers";
import {
  useApplySellerEnforcement,
  useLiftSellerEnforcement,
} from "../api/seller-enforcement-api";
import type {
  Seller,
  SellerEnforcementReasonCode,
  SellerEnforcementStatus,
} from "../types";
import { REASON_CODE_LABELS } from "../workflow";

interface Props {
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
  readonly seller: Seller | null;
  readonly targetStatus: SellerEnforcementStatus | null;
}

const REASON_OPTIONS: { label: string; value: SellerEnforcementReasonCode }[] =
  [
    { label: REASON_CODE_LABELS.POLICY_VIOLATION, value: "POLICY_VIOLATION" },
    { label: REASON_CODE_LABELS.FRAUD_RISK, value: "FRAUD_RISK" },
    { label: REASON_CODE_LABELS.FULFILLMENT_RISK, value: "FULFILLMENT_RISK" },
    { label: REASON_CODE_LABELS.FINANCIAL_RISK, value: "FINANCIAL_RISK" },
    { label: REASON_CODE_LABELS.OTHER, value: "OTHER" },
  ];

export const EnforcementDialog = ({
  onOpenChange,
  open,
  seller,
  targetStatus,
}: Props) => {
  const [reasonCode, setReasonCode] =
    useState<SellerEnforcementReasonCode>("POLICY_VIOLATION");
  const [sellerReason, setSellerReason] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [confirmOrderItems, setConfirmOrderItems] = useState(false);
  const [confirmEscrowHolds, setConfirmEscrowHolds] = useState(false);
  const [confirmWithdrawals, setConfirmWithdrawals] = useState(false);

  const applyMutation = useApplySellerEnforcement();
  const liftMutation = useLiftSellerEnforcement();

  if (!seller || !targetStatus) {
    return null;
  }

  const isPending = applyMutation.isPending || liftMutation.isPending;
  const isDestructive =
    targetStatus === "BANNED" || targetStatus === "SUSPENDED";

  const handleConfirm = async () => {
    const trimmedReason = sellerReason.trim();
    if (!trimmedReason) {
      toast.error("Vui lòng nhập lý do xử lý vi phạm gửi tới Seller.");
      return;
    }

    if (
      targetStatus === "BANNED" &&
      (!confirmOrderItems || !confirmEscrowHolds || !confirmWithdrawals)
    ) {
      toast.error(
        "Cấm Seller yêu cầu xác nhận đủ cả 3 cam kết xử lý đơn hàng, escrow và rút tiền."
      );
      return;
    }

    try {
      await (targetStatus === "ACTIVE"
        ? liftMutation.mutateAsync({
            adminNote: adminNote.trim() || undefined,
            idempotencyKey: crypto.randomUUID(),
            reasonCode,
            sellerId: seller.id,
            sellerReason: trimmedReason,
          })
        : applyMutation.mutateAsync({
            adminNote: adminNote.trim() || undefined,
            confirmAffectedEscrowHolds:
              targetStatus === "BANNED" ? confirmEscrowHolds : undefined,
            confirmAffectedOrderItems:
              targetStatus === "BANNED" ? confirmOrderItems : undefined,
            confirmAffectedWithdrawals:
              targetStatus === "BANNED" ? confirmWithdrawals : undefined,
            expiresAt:
              targetStatus === "SUSPENDED" && expiresAt
                ? new Date(expiresAt)
                : null,
            idempotencyKey: crypto.randomUUID(),
            reasonCode,
            sellerId: seller.id,
            sellerReason: trimmedReason,
            state: targetStatus,
          }));

      // Update mock store for compatibility with mock views
      try {
        updateSellerEnforcement(seller.id, targetStatus, trimmedReason);
      } catch {
        // Mock fallback if seller is real backend id
      }

      toast.success(`Cập nhật trạng thái Seller thành công (${targetStatus})`, {
        description: `Đã áp dụng chế tài cho ${seller.storefrontName}`,
      });
      onOpenChange(false);
      setSellerReason("");
      setAdminNote("");
      setExpiresAt("");
      setConfirmOrderItems(false);
      setConfirmEscrowHolds(false);
      setConfirmWithdrawals(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Thao tác thất bại");
    }
  };

  const renderTitle = () => {
    if (targetStatus === "ACTIVE") {
      return "Khôi phục trạng thái Hoạt Động (Lift Enforcement)";
    }
    if (targetStatus === "SUSPENDED") {
      return "Tạm dừng hoạt động Seller (Suspend)";
    }
    return "Cấm vĩnh viễn Seller (Ban)";
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {targetStatus === "BANNED" ? (
              <ProhibitIcon className="size-5 text-destructive" />
            ) : (
              <ShieldWarningIcon className="size-5 text-primary" />
            )}
            <DialogTitle>{renderTitle()}</DialogTitle>
          </div>
          <DialogDescription>
            Thực hiện trên storefront <strong>{seller.storefrontName}</strong>.
            Thao tác này ghi lại nhật ký Enforcement Action và gửi thông báo tới
            Seller.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 text-sm">
          <div className="grid gap-1.5">
            <Label htmlFor="reason-code">Mã phân loại vi phạm</Label>
            <Select
              items={REASON_OPTIONS}
              onValueChange={(val) =>
                setReasonCode(val as SellerEnforcementReasonCode)
              }
              value={reasonCode}
            >
              <SelectTrigger id="reason-code">
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
            <Label htmlFor="seller-reason">
              Lý do gửi tới Seller (Bắt buộc, công khai với Seller){" "}
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              disabled={isPending}
              id="seller-reason"
              maxLength={2000}
              onChange={(e) => setSellerReason(e.target.value)}
              placeholder="Nhập chi tiết căn cứ xử phạt hoặc vi phạm điều khoản..."
              rows={3}
              value={sellerReason}
            />
            <p className="text-xs text-muted-foreground text-end">
              {sellerReason.length}/2000 ký tự
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="admin-note">
              Ghi chú nội bộ Admin (Tùy chọn, chỉ Admin xem được)
            </Label>
            <Textarea
              disabled={isPending}
              id="admin-note"
              maxLength={5000}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Ghi chú hồ sơ điều tra, đối chứng giao dịch nội bộ..."
              rows={2}
              value={adminNote}
            />
          </div>

          {targetStatus === "SUSPENDED" ? (
            <div className="grid gap-1.5">
              <Label htmlFor="expires-at">
                Thời hạn tạm dừng (Tùy chọn, để trống nếu không xác định hạn)
              </Label>
              <Input
                disabled={isPending}
                id="expires-at"
                onChange={(e) => setExpiresAt(e.target.value)}
                type="datetime-local"
                value={expiresAt}
              />
              <p className="text-xs text-muted-foreground">
                Nếu đặt thời hạn, hệ thống sẽ tự động khôi phục gian hàng khi
                hết hạn.
              </p>
            </div>
          ) : null}

          {targetStatus === "BANNED" ? (
            <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-xs">
              <p className="font-semibold text-destructive">
                Xác nhận bắt buộc để Ban Seller (Hệ thống bảo vệ khách hàng):
              </p>
              <div className="flex items-start gap-2.5">
                <Checkbox
                  checked={confirmOrderItems}
                  id="confirm-order-items"
                  onCheckedChange={(c) => setConfirmOrderItems(Boolean(c))}
                />
                <label
                  className="leading-snug cursor-pointer"
                  htmlFor="confirm-order-items"
                >
                  Xác nhận tự động hủy và hoàn tiền toàn bộ các OrderItem chưa
                  bàn giao (AWAITING_SELLER / IN_PROGRESS).
                </label>
              </div>

              <div className="flex items-start gap-2.5">
                <Checkbox
                  checked={confirmEscrowHolds}
                  id="confirm-escrow-holds"
                  onCheckedChange={(c) => setConfirmEscrowHolds(Boolean(c))}
                />
                <label
                  className="leading-snug cursor-pointer"
                  htmlFor="confirm-escrow-holds"
                >
                  Xác nhận đóng băng và tự động xử lý các khoản EscrowHold tương
                  ứng.
                </label>
              </div>

              <div className="flex items-start gap-2.5">
                <Checkbox
                  checked={confirmWithdrawals}
                  id="confirm-withdrawals"
                  onCheckedChange={(c) => setConfirmWithdrawals(Boolean(c))}
                />
                <label
                  className="leading-snug cursor-pointer"
                  htmlFor="confirm-withdrawals"
                >
                  Xác nhận đóng băng các yêu cầu rút tiền đang chờ xử lý.
                </label>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button
            disabled={isPending}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Hủy
          </Button>
          <Button
            disabled={isPending}
            onClick={() => void handleConfirm()}
            variant={isDestructive ? "destructive" : "default"}
          >
            {isPending ? "Đang xử lý..." : `Xác nhận ${targetStatus}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
