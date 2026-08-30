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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@avin/ui/components/field";
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
import {
  CalendarBlankIcon,
  ProhibitIcon,
  ShieldWarningIcon,
} from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { format } from "date-fns";
import { toast } from "sonner";

import {
  useApplySellerEnforcement,
  useLiftSellerEnforcement,
} from "../api/seller-enforcement-api";
import { createSellerEnforcementFormSchema } from "../schemas/seller-enforcement-form-schema";
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

const REASON_OPTIONS: {
  label: string;
  value: SellerEnforcementReasonCode;
}[] = [
  { label: REASON_CODE_LABELS.POLICY_VIOLATION, value: "POLICY_VIOLATION" },
  { label: REASON_CODE_LABELS.FRAUD_RISK, value: "FRAUD_RISK" },
  { label: REASON_CODE_LABELS.FULFILLMENT_RISK, value: "FULFILLMENT_RISK" },
  { label: REASON_CODE_LABELS.FINANCIAL_RISK, value: "FINANCIAL_RISK" },
  { label: REASON_CODE_LABELS.OTHER, value: "OTHER" },
];

const getConfirmLabel = (status: SellerEnforcementStatus): string => {
  if (status === "ACTIVE") {
    return "Khôi phục";
  }
  if (status === "SUSPENDED") {
    return "Tạm dừng";
  }
  return "Cấm vĩnh viễn";
};

const getEffectiveTargetStatus = (
  seller: SellerRef | null,
  targetStatus?: SellerEnforcementStatus | null
): SellerEnforcementStatus => {
  if (!seller) {
    return "SUSPENDED";
  }
  if (targetStatus) {
    return targetStatus;
  }
  if (seller.enforcementStatus === "ACTIVE") {
    return "SUSPENDED";
  }
  if (seller.enforcementStatus === "SUSPENDED") {
    return "BANNED";
  }
  return "ACTIVE";
};

const getDialogTitle = (status: SellerEnforcementStatus): string => {
  if (status === "ACTIVE") {
    return "Khôi phục hoạt động gian hàng";
  }
  if (status === "SUSPENDED") {
    return "Tạm dừng hoạt động gian hàng";
  }
  return "Cấm vĩnh viễn gian hàng";
};

export const EnforcementDialog = ({
  onOpenChange,
  open,
  seller,
  targetStatus,
}: Props) => {
  const applyMutation = useApplySellerEnforcement();
  const liftMutation = useLiftSellerEnforcement();
  const effectiveTargetStatus = getEffectiveTargetStatus(seller, targetStatus);
  const enforcementForm = useForm({
    defaultValues: {
      adminNote: "",
      confirmEscrowHolds: false,
      confirmOrderItems: false,
      confirmWithdrawals: false,
      expiresAt: undefined as Date | undefined,
      reasonCode: "POLICY_VIOLATION" as SellerEnforcementReasonCode,
      sellerReason: "",
    },
    onSubmit: async ({ value }) => {
      if (!seller) {
        return;
      }

      try {
        await (effectiveTargetStatus === "ACTIVE"
          ? liftMutation.mutateAsync({
              adminNote: value.adminNote.trim() || undefined,
              idempotencyKey: crypto.randomUUID(),
              reasonCode: value.reasonCode,
              sellerId: seller.id,
              sellerReason: value.sellerReason.trim(),
            })
          : applyMutation.mutateAsync({
              adminNote: value.adminNote.trim() || undefined,
              confirmAffectedEscrowHolds:
                effectiveTargetStatus === "BANNED"
                  ? value.confirmEscrowHolds
                  : undefined,
              confirmAffectedOrderItems:
                effectiveTargetStatus === "BANNED"
                  ? value.confirmOrderItems
                  : undefined,
              confirmAffectedWithdrawals:
                effectiveTargetStatus === "BANNED"
                  ? value.confirmWithdrawals
                  : undefined,
              expiresAt:
                effectiveTargetStatus === "SUSPENDED" && value.expiresAt
                  ? value.expiresAt
                  : null,
              idempotencyKey: crypto.randomUUID(),
              reasonCode: value.reasonCode,
              sellerId: seller.id,
              sellerReason: value.sellerReason.trim(),
              state: effectiveTargetStatus,
            }));

        toast.success("Cập nhật trạng thái gian hàng thành công", {
          description: `Đã áp dụng chế tài cho ${seller.storefrontName}`,
        });
        enforcementForm.reset();
        onOpenChange(false);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Thao tác thất bại"
        );
      }
    },
    validators: {
      onSubmit: createSellerEnforcementFormSchema(effectiveTargetStatus),
    },
  });

  if (!seller) {
    return null;
  }

  const isPending = applyMutation.isPending || liftMutation.isPending;
  const isDestructive =
    effectiveTargetStatus === "BANNED" || effectiveTargetStatus === "SUSPENDED";
  const title = getDialogTitle(effectiveTargetStatus);

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isPending) {
          enforcementForm.reset();
        }
        onOpenChange(nextOpen);
      }}
      open={open}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {effectiveTargetStatus === "BANNED" ? (
              <ProhibitIcon className="size-5 text-destructive" />
            ) : (
              <ShieldWarningIcon className="size-5 text-primary" />
            )}
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>
            Thực hiện trên gian hàng <strong>{seller.storefrontName}</strong>.
            Thao tác này ghi lại nhật ký xử lý vi phạm và gửi thông báo tới
            Người bán.
          </DialogDescription>
        </DialogHeader>

        <form
          id="seller-enforcement-form"
          onSubmit={async (event) => {
            event.preventDefault();
            event.stopPropagation();
            await enforcementForm.handleSubmit();
          }}
        >
          <FieldGroup className="gap-4 py-2 text-sm">
            <enforcementForm.Field name="reasonCode">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="reason-code">
                    Mã phân loại vi phạm
                  </FieldLabel>
                  <Select
                    items={REASON_OPTIONS}
                    onValueChange={(value) => {
                      const nextReasonCode = REASON_OPTIONS.find(
                        (option) => option.value === value
                      )?.value;
                      if (nextReasonCode) {
                        field.handleChange(nextReasonCode);
                      }
                    }}
                    value={field.state.value}
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
                </Field>
              )}
            </enforcementForm.Field>

            <enforcementForm.Field name="sellerReason">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="seller-reason">
                      Lý do gửi tới Người bán (Bắt buộc, công khai với Người
                      bán) <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Textarea
                      aria-invalid={isInvalid}
                      disabled={isPending}
                      id="seller-reason"
                      maxLength={2000}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="Nhập chi tiết căn cứ xử phạt hoặc vi phạm điều khoản..."
                      rows={3}
                      value={field.state.value}
                    />
                    <p className="text-xs text-muted-foreground text-end">
                      {field.state.value.length}/2000 ký tự
                    </p>
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                );
              }}
            </enforcementForm.Field>

            <enforcementForm.Field name="adminNote">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="admin-note">
                      Ghi chú nội bộ (Tùy chọn, chỉ Quản trị viên xem được)
                    </FieldLabel>
                    <Textarea
                      aria-invalid={isInvalid}
                      disabled={isPending}
                      id="admin-note"
                      maxLength={5000}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="Ghi chú hồ sơ điều tra, đối chứng giao dịch nội bộ..."
                      rows={2}
                      value={field.state.value}
                    />
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                );
              }}
            </enforcementForm.Field>

            {effectiveTargetStatus === "SUSPENDED" ? (
              <enforcementForm.Field name="expiresAt">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="suspension-expires-at">
                      Thời hạn tạm dừng (Tùy chọn, để trống nếu không xác định
                      hạn)
                    </FieldLabel>
                    <Popover>
                      <PopoverTrigger
                        className="flex h-9 w-full items-center justify-start rounded-3xl border border-transparent bg-input/50 px-3 text-left text-base font-normal text-muted-foreground transition-[color,box-shadow,background-color] outline-none hover:bg-input/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm cursor-pointer"
                        disabled={isPending}
                        id="suspension-expires-at"
                        type="button"
                      >
                        <CalendarBlankIcon className="mr-2 size-4 shrink-0 text-muted-foreground" />
                        {field.state.value
                          ? format(field.state.value, "dd/MM/yyyy")
                          : "dd/mm/yyyy"}
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          onSelect={(date) => field.handleChange(date)}
                          selected={field.state.value}
                        />
                      </PopoverContent>
                    </Popover>
                    <FieldDescription>
                      Nếu đặt thời hạn, hệ thống sẽ tự động khôi phục gian hàng
                      khi hết hạn.
                    </FieldDescription>
                  </Field>
                )}
              </enforcementForm.Field>
            ) : null}

            {effectiveTargetStatus === "BANNED" ? (
              <FieldGroup className="gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-xs">
                <p className="font-semibold text-destructive">
                  Xác nhận bắt buộc để cấm gian hàng (Hệ thống bảo vệ khách
                  hàng):
                </p>

                <enforcementForm.Field name="confirmOrderItems">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid} orientation="horizontal">
                        <Checkbox
                          aria-invalid={isInvalid}
                          checked={field.state.value}
                          disabled={isPending}
                          id="confirm-order-items"
                          onCheckedChange={(checked) =>
                            field.handleChange(Boolean(checked))
                          }
                          onBlur={field.handleBlur}
                        />
                        <FieldLabel
                          className="cursor-pointer leading-snug"
                          htmlFor="confirm-order-items"
                        >
                          Xác nhận tự động hủy và hoàn tiền toàn bộ các sản phẩm
                          trong đơn hàng chưa bàn giao.
                        </FieldLabel>
                        {isInvalid ? (
                          <FieldError errors={field.state.meta.errors} />
                        ) : null}
                      </Field>
                    );
                  }}
                </enforcementForm.Field>

                <enforcementForm.Field name="confirmEscrowHolds">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid} orientation="horizontal">
                        <Checkbox
                          aria-invalid={isInvalid}
                          checked={field.state.value}
                          disabled={isPending}
                          id="confirm-escrow-holds"
                          onCheckedChange={(checked) =>
                            field.handleChange(Boolean(checked))
                          }
                          onBlur={field.handleBlur}
                        />
                        <FieldLabel
                          className="cursor-pointer leading-snug"
                          htmlFor="confirm-escrow-holds"
                        >
                          Xác nhận đóng băng và tự động xử lý các khoản tiền tạm
                          giữ tương ứng.
                        </FieldLabel>
                        {isInvalid ? (
                          <FieldError errors={field.state.meta.errors} />
                        ) : null}
                      </Field>
                    );
                  }}
                </enforcementForm.Field>

                <enforcementForm.Field name="confirmWithdrawals">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid} orientation="horizontal">
                        <Checkbox
                          aria-invalid={isInvalid}
                          checked={field.state.value}
                          disabled={isPending}
                          id="confirm-withdrawals"
                          onCheckedChange={(checked) =>
                            field.handleChange(Boolean(checked))
                          }
                          onBlur={field.handleBlur}
                        />
                        <FieldLabel
                          className="cursor-pointer leading-snug"
                          htmlFor="confirm-withdrawals"
                        >
                          Xác nhận đóng băng các yêu cầu rút tiền đang chờ xử
                          lý.
                        </FieldLabel>
                        {isInvalid ? (
                          <FieldError errors={field.state.meta.errors} />
                        ) : null}
                      </Field>
                    );
                  }}
                </enforcementForm.Field>
              </FieldGroup>
            ) : null}
          </FieldGroup>

          <DialogFooter className="gap-2 pt-4 sm:justify-end">
            <Button
              disabled={isPending}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Hủy
            </Button>
            <enforcementForm.Subscribe
              selector={(state) => ({
                canSubmit: state.canSubmit,
                isSubmitting: state.isSubmitting,
              })}
            >
              {({ canSubmit, isSubmitting }) => (
                <Button
                  disabled={isPending || isSubmitting || !canSubmit}
                  form="seller-enforcement-form"
                  type="submit"
                  variant={isDestructive ? "destructive" : "default"}
                >
                  {isPending || isSubmitting
                    ? "Đang xử lý..."
                    : getConfirmLabel(effectiveTargetStatus)}
                </Button>
              )}
            </enforcementForm.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
