import { Button } from "@avin/ui/components/button";
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@avin/ui/components/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avin/ui/components/select";
import { Textarea } from "@avin/ui/components/textarea";
import { NotePencilIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";

import { useCorrectEnforcementReason } from "../api/seller-enforcement-api";
import {
  sellerEnforcementReasonCodeSchema,
  sellerEnforcementReasonCorrectionFormSchema,
} from "../schemas/seller-enforcement-form-schema";
import type { SellerEnforcementReasonCode } from "../types";
import { REASON_CODE_LABELS } from "../workflow";

interface Props {
  readonly currentReason?: string;
  readonly currentReasonCode?: SellerEnforcementReasonCode;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
  readonly sellerId: string;
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

export const ReasonCorrectionDialog = ({
  currentReason = "",
  currentReasonCode = "POLICY_VIOLATION",
  onOpenChange,
  open,
  sellerId,
}: Props) => {
  const correctMutation = useCorrectEnforcementReason();
  const correctionForm = useForm({
    defaultValues: {
      adminNote: "",
      reasonCode: currentReasonCode,
      sellerReason: currentReason,
    },
    onSubmit: async ({ value }) => {
      try {
        await correctMutation.mutateAsync({
          adminNote: value.adminNote.trim() || undefined,
          idempotencyKey: crypto.randomUUID(),
          reasonCode: value.reasonCode,
          sellerId,
          sellerReason: value.sellerReason.trim(),
        });

        toast.success("Hiệu chỉnh lý do xử phạt thành công", {
          description:
            "Hệ thống đã ghi lại bản ghi hiệu chỉnh (Reason Corrected).",
        });
        correctionForm.reset();
        onOpenChange(false);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Thao tác thất bại"
        );
      }
    },
    validators: { onSubmit: sellerEnforcementReasonCorrectionFormSchema },
  });

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !correctMutation.isPending) {
          correctionForm.reset();
        }
        onOpenChange(nextOpen);
      }}
      open={open}
    >
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

        <form
          id="seller-enforcement-reason-correction-form"
          onSubmit={async (event) => {
            event.preventDefault();
            event.stopPropagation();
            await correctionForm.handleSubmit();
          }}
        >
          <FieldGroup className="gap-4 py-2 text-sm">
            <correctionForm.Field name="reasonCode">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="correct-reason-code">
                    Mã phân loại vi phạm
                  </FieldLabel>
                  <Select
                    items={REASON_OPTIONS}
                    onValueChange={(value) => {
                      const nextReasonCode = REASON_OPTIONS.find(
                        (option) => option.value === value
                      )?.value;
                      if (
                        nextReasonCode &&
                        sellerEnforcementReasonCodeSchema.safeParse(
                          nextReasonCode
                        ).success
                      ) {
                        field.handleChange(nextReasonCode);
                      }
                    }}
                    value={field.state.value}
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
                </Field>
              )}
            </correctionForm.Field>

            <correctionForm.Field name="sellerReason">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="correct-seller-reason">
                      Lý do gửi tới Seller (Bắt buộc){" "}
                      <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Textarea
                      aria-invalid={isInvalid}
                      disabled={correctMutation.isPending}
                      id="correct-seller-reason"
                      maxLength={2000}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="Nhập lý do chính xác đã điều chỉnh..."
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
            </correctionForm.Field>

            <correctionForm.Field name="adminNote">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="correct-admin-note">
                      Ghi chú nội bộ Admin (Tùy chọn)
                    </FieldLabel>
                    <Textarea
                      aria-invalid={isInvalid}
                      disabled={correctMutation.isPending}
                      id="correct-admin-note"
                      maxLength={5000}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="Ghi chú lý do cần hiệu chỉnh lại căn cứ xử phạt..."
                      rows={2}
                      value={field.state.value}
                    />
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                );
              }}
            </correctionForm.Field>
          </FieldGroup>

          <DialogFooter className="gap-2 pt-4 sm:justify-end">
            <Button
              disabled={correctMutation.isPending}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Hủy
            </Button>
            <correctionForm.Subscribe
              selector={(state) => ({
                canSubmit: state.canSubmit,
                isSubmitting: state.isSubmitting,
              })}
            >
              {({ canSubmit, isSubmitting }) => (
                <Button
                  disabled={
                    !canSubmit || isSubmitting || correctMutation.isPending
                  }
                  form="seller-enforcement-reason-correction-form"
                  type="submit"
                >
                  {isSubmitting || correctMutation.isPending
                    ? "Đang lưu..."
                    : "Lưu hiệu chỉnh"}
                </Button>
              )}
            </correctionForm.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
