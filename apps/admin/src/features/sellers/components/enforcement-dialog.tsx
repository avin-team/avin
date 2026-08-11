import { Button } from "@avin/ui/components/button";
import { Calendar } from "@avin/ui/components/calendar";
import { Checkbox } from "@avin/ui/components/checkbox";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@avin/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avin/ui/components/select";
import { Textarea } from "@avin/ui/components/textarea";
import { cn } from "@avin/ui/lib/utils";
import {
  CalendarBlankIcon,
  ProhibitIcon,
  ShieldWarningIcon,
} from "@phosphor-icons/react";
import { format } from "date-fns";
import { useReducer } from "react";
import { toast } from "sonner";

import { updateSellerEnforcement } from "../api/mock-sellers";
import {
  useApplySellerEnforcement,
  useLiftSellerEnforcement,
} from "../api/seller-enforcement-api";
import type {
  SellerEnforcementReasonCode,
  SellerEnforcementStatus,
} from "../types";
import { REASON_CODE_LABELS } from "../workflow";

interface SellerRef {
  readonly enforcementStatus: SellerEnforcementStatus;
  readonly id: string;
  readonly storefrontName: string;
}

interface Props {
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
  readonly seller: SellerRef | null;
  readonly targetStatus?: SellerEnforcementStatus | null;
}

const REASON_OPTIONS: { label: string; value: SellerEnforcementReasonCode }[] =
  [
    { label: REASON_CODE_LABELS.POLICY_VIOLATION, value: "POLICY_VIOLATION" },
    { label: REASON_CODE_LABELS.FRAUD_RISK, value: "FRAUD_RISK" },
    { label: REASON_CODE_LABELS.FULFILLMENT_RISK, value: "FULFILLMENT_RISK" },
    { label: REASON_CODE_LABELS.FINANCIAL_RISK, value: "FINANCIAL_RISK" },
    { label: REASON_CODE_LABELS.OTHER, value: "OTHER" },
  ];

interface DialogFormState {
  adminNote: string;
  confirmEscrowHolds: boolean;
  confirmOrderItems: boolean;
  confirmWithdrawals: boolean;
  expiresAt: Date | undefined;
  reasonCode: SellerEnforcementReasonCode;
  sellerReason: string;
}

type DialogFormAction =
  | { type: "RESET" }
  | { field: "adminNote"; type: "SET_TEXT"; value: string }
  | { field: "sellerReason"; type: "SET_TEXT"; value: string }
  | {
      field: "reasonCode";
      type: "SET_REASON";
      value: SellerEnforcementReasonCode;
    }
  | {
      field: "confirmOrderItems" | "confirmEscrowHolds" | "confirmWithdrawals";
      type: "SET_BOOL";
      value: boolean;
    }
  | { type: "SET_EXPIRES_AT"; value: Date | undefined };

const INITIAL_FORM_STATE: DialogFormState = {
  adminNote: "",
  confirmEscrowHolds: false,
  confirmOrderItems: false,
  confirmWithdrawals: false,
  expiresAt: undefined,
  reasonCode: "POLICY_VIOLATION",
  sellerReason: "",
};

const formReducer = (
  state: DialogFormState,
  action: DialogFormAction
): DialogFormState => {
  if (action.type === "RESET") {
    return INITIAL_FORM_STATE;
  }
  if (action.type === "SET_TEXT") {
    return { ...state, [action.field]: action.value };
  }
  if (action.type === "SET_REASON") {
    return { ...state, reasonCode: action.value };
  }
  if (action.type === "SET_BOOL") {
    return { ...state, [action.field]: action.value };
  }
  if (action.type === "SET_EXPIRES_AT") {
    return { ...state, expiresAt: action.value };
  }
  return state;
};

const getConfirmLabel = (status: SellerEnforcementStatus): string => {
  if (status === "ACTIVE") {
    return "Khôi phục";
  }
  if (status === "SUSPENDED") {
    return "Tạm dừng";
  }
  return "Cấm vĩnh viễn";
};

export const EnforcementDialog = ({
  onOpenChange,
  open,
  seller,
  targetStatus,
}: Props) => {
  const [form, dispatch] = useReducer(formReducer, INITIAL_FORM_STATE);
  const {
    adminNote,
    confirmEscrowHolds,
    confirmOrderItems,
    confirmWithdrawals,
    expiresAt,
    reasonCode,
    sellerReason,
  } = form;

  const applyMutation = useApplySellerEnforcement();
  const liftMutation = useLiftSellerEnforcement();

  if (!seller) {
    return null;
  }

  // Derive targetStatus when not explicitly passed
  // Active → SUSPENDED, Suspended → BANNED, Banned → ACTIVE (lift)
  let effectiveTargetStatus: SellerEnforcementStatus;
  if (targetStatus) {
    effectiveTargetStatus = targetStatus;
  } else if (seller.enforcementStatus === "ACTIVE") {
    effectiveTargetStatus = "SUSPENDED";
  } else if (seller.enforcementStatus === "SUSPENDED") {
    effectiveTargetStatus = "BANNED";
  } else {
    effectiveTargetStatus = "ACTIVE";
  }

  const isPending = applyMutation.isPending || liftMutation.isPending;
  const isDestructive =
    effectiveTargetStatus === "BANNED" || effectiveTargetStatus === "SUSPENDED";

  const handleConfirm = async () => {
    const trimmedReason = sellerReason.trim();
    if (!trimmedReason) {
      toast.error("Vui lòng nhập lý do xử lý vi phạm gửi tới Seller.");
      return;
    }

    if (
      effectiveTargetStatus === "BANNED" &&
      (!confirmOrderItems || !confirmEscrowHolds || !confirmWithdrawals)
    ) {
      toast.error(
        "Việc cấm gian hàng yêu cầu xác nhận đủ cả 3 cam kết xử lý đơn hàng, khoản tiền tạm giữ và rút tiền."
      );
      return;
    }

    try {
      await (effectiveTargetStatus === "ACTIVE"
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
              effectiveTargetStatus === "BANNED"
                ? confirmEscrowHolds
                : undefined,
            confirmAffectedOrderItems:
              effectiveTargetStatus === "BANNED"
                ? confirmOrderItems
                : undefined,
            confirmAffectedWithdrawals:
              effectiveTargetStatus === "BANNED"
                ? confirmWithdrawals
                : undefined,
            expiresAt:
              effectiveTargetStatus === "SUSPENDED" && expiresAt
                ? expiresAt
                : null,
            idempotencyKey: crypto.randomUUID(),
            reasonCode,
            sellerId: seller.id,
            sellerReason: trimmedReason,
            state: effectiveTargetStatus,
          }));

      // Update mock store for compatibility with mock views
      try {
        updateSellerEnforcement(
          seller.id,
          effectiveTargetStatus,
          trimmedReason
        );
      } catch {
        // Mock fallback if seller is real backend id
      }

      toast.success("Cập nhật trạng thái gian hàng thành công", {
        description: `Đã áp dụng chế tài cho ${seller.storefrontName}`,
      });
      onOpenChange(false);
      dispatch({ type: "RESET" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Thao tác thất bại");
    }
  };

  const renderTitle = () => {
    if (effectiveTargetStatus === "ACTIVE") {
      return "Khôi phục hoạt động gian hàng";
    }
    if (effectiveTargetStatus === "SUSPENDED") {
      return "Tạm dừng hoạt động gian hàng";
    }
    return "Cấm vĩnh viễn gian hàng";
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {effectiveTargetStatus === "BANNED" ? (
              <ProhibitIcon className="size-5 text-destructive" />
            ) : (
              <ShieldWarningIcon className="size-5 text-primary" />
            )}
            <DialogTitle>{renderTitle()}</DialogTitle>
          </div>
          <DialogDescription>
            Thực hiện trên gian hàng <strong>{seller.storefrontName}</strong>.
            Thao tác này ghi lại nhật ký xử lý vi phạm và gửi thông báo tới
            Người bán.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 text-sm">
          <div className="grid gap-1.5">
            <Label htmlFor="reason-code">Mã phân loại vi phạm</Label>
            <Select
              items={REASON_OPTIONS}
              onValueChange={(val) =>
                dispatch({
                  field: "reasonCode",
                  type: "SET_REASON",
                  value: val as SellerEnforcementReasonCode,
                })
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
              Lý do gửi tới Người bán (Bắt buộc, công khai với Người bán){" "}
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              disabled={isPending}
              id="seller-reason"
              maxLength={2000}
              onChange={(e) =>
                dispatch({
                  field: "sellerReason",
                  type: "SET_TEXT",
                  value: e.target.value,
                })
              }
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
              Ghi chú nội bộ (Tùy chọn, chỉ Quản trị viên xem được)
            </Label>
            <Textarea
              disabled={isPending}
              id="admin-note"
              maxLength={5000}
              onChange={(e) =>
                dispatch({
                  field: "adminNote",
                  type: "SET_TEXT",
                  value: e.target.value,
                })
              }
              placeholder="Ghi chú hồ sơ điều tra, đối chứng giao dịch nội bộ..."
              rows={2}
              value={adminNote}
            />
          </div>

          {effectiveTargetStatus === "SUSPENDED" ? (
            <div className="grid gap-1.5">
              <Label>
                Thời hạn tạm dừng (Tùy chọn, để trống nếu không xác định hạn)
              </Label>
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      disabled={isPending}
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !expiresAt && "text-muted-foreground"
                      )}
                    >
                      <CalendarBlankIcon className="mr-2 size-4" />
                      {expiresAt
                        ? format(expiresAt, "dd/MM/yyyy")
                        : "dd/mm/yyyy"}
                    </Button>
                  }
                />
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={expiresAt}
                    onSelect={(date) =>
                      dispatch({ type: "SET_EXPIRES_AT", value: date })
                    }
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Nếu đặt thời hạn, hệ thống sẽ tự động khôi phục gian hàng khi
                hết hạn.
              </p>
            </div>
          ) : null}

          {effectiveTargetStatus === "BANNED" ? (
            <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-xs">
              <p className="font-semibold text-destructive">
                Xác nhận bắt buộc để cấm gian hàng (Hệ thống bảo vệ khách hàng):
              </p>
              <div className="flex items-start gap-2.5">
                <Checkbox
                  checked={confirmOrderItems}
                  id="confirm-order-items"
                  onCheckedChange={(c) =>
                    dispatch({
                      field: "confirmOrderItems",
                      type: "SET_BOOL",
                      value: Boolean(c),
                    })
                  }
                />
                <label
                  className="leading-snug cursor-pointer"
                  htmlFor="confirm-order-items"
                >
                  Xác nhận tự động hủy và hoàn tiền toàn bộ các sản phẩm trong
                  đơn hàng chưa bàn giao.
                </label>
              </div>

              <div className="flex items-start gap-2.5">
                <Checkbox
                  checked={confirmEscrowHolds}
                  id="confirm-escrow-holds"
                  onCheckedChange={(c) =>
                    dispatch({
                      field: "confirmEscrowHolds",
                      type: "SET_BOOL",
                      value: Boolean(c),
                    })
                  }
                />
                <label
                  className="leading-snug cursor-pointer"
                  htmlFor="confirm-escrow-holds"
                >
                  Xác nhận đóng băng và tự động xử lý các khoản tiền tạm giữ
                  tương ứng.
                </label>
              </div>

              <div className="flex items-start gap-2.5">
                <Checkbox
                  checked={confirmWithdrawals}
                  id="confirm-withdrawals"
                  onCheckedChange={(c) =>
                    dispatch({
                      field: "confirmWithdrawals",
                      type: "SET_BOOL",
                      value: Boolean(c),
                    })
                  }
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
            {isPending
              ? "Đang xử lý..."
              : getConfirmLabel(effectiveTargetStatus)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
