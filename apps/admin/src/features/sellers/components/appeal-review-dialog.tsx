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
import { ShieldCheckIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";

import { useReviewSellerAppeal } from "../api/seller-enforcement-api";
import { sellerAppealReviewFormSchema } from "../schemas/seller-enforcement-form-schema";
import type { EnforcementAppeal, SellerEnforcementReasonCode } from "../types";
import { REASON_CODE_LABELS } from "../workflow";

interface Props {
  readonly appeal: EnforcementAppeal | null;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
  readonly sellerId: string;
}

const OUTCOME_OPTIONS = [
  { label: "Chuyển sang Đang thẩm định", value: "UNDER_REVIEW" },
  { label: "Bác bỏ khiếu nại (Giữ nguyên phạt)", value: "UPHELD" },
  {
    label: "Chấp thuận khiếu nại (Hủy phạt & Khôi phục)",
    value: "OVERTURNED",
  },
] as const;

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

export const AppealReviewDialog = ({
  appeal,
  onOpenChange,
  open,
  sellerId,
}: Props) => {
  const reviewMutation = useReviewSellerAppeal(sellerId);
  const reviewForm = useForm({
    defaultValues: {
      adminNote: "",
      outcome: "UNDER_REVIEW" as (typeof OUTCOME_OPTIONS)[number]["value"],
      outcomeReason: "",
      reasonCode: "POLICY_VIOLATION" as SellerEnforcementReasonCode,
    },
    onSubmit: async ({ value }) => {
      if (!appeal) {
        return;
      }

      try {
        await reviewMutation.mutateAsync({
          adminNote: value.adminNote.trim() || undefined,
          appealId: appeal.id,
          outcome: value.outcome,
          outcomeReason: value.outcomeReason.trim() || undefined,
          reasonCode: value.reasonCode,
        });

        toast.success(`Thẩm định khiếu nại thành công (${value.outcome})`, {
          description:
            value.outcome === "OVERTURNED"
              ? "Quyết định xử phạt đã được hủy và trạng thái gian hàng đã được khôi phục bình thường."
              : "Đã cập nhật trạng thái khiếu nại.",
        });
        reviewForm.reset();
        onOpenChange(false);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Thao tác thất bại"
        );
      }
    },
    validators: { onSubmit: sellerAppealReviewFormSchema },
  });

  if (!appeal) {
    return null;
  }

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !reviewMutation.isPending) {
          reviewForm.reset();
        }
        onOpenChange(nextOpen);
      }}
      open={open}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheckIcon className="size-5" />
            <DialogTitle>Thẩm định đơn khiếu nại</DialogTitle>
          </div>
          <DialogDescription>
            Đưa ra kết luận thẩm định đối với đơn khiếu nại của Người bán.
          </DialogDescription>
        </DialogHeader>

        <form
          id="seller-appeal-review-form"
          onSubmit={async (event) => {
            event.preventDefault();
            event.stopPropagation();
            await reviewForm.handleSubmit();
          }}
        >
          <FieldGroup className="gap-4 py-2 text-sm">
            <div className="rounded-xl bg-muted/40 p-3 text-xs">
              <p className="font-semibold text-foreground">
                Giải trình của Người bán:
              </p>
              <p className="mt-1 leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {appeal.sellerReason}
              </p>
            </div>

            <reviewForm.Field name="outcome">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="review-outcome">
                    Quyết định thẩm định
                  </FieldLabel>
                  <Select
                    items={OUTCOME_OPTIONS}
                    onValueChange={(value) => {
                      const nextOutcome = OUTCOME_OPTIONS.find(
                        (option) => option.value === value
                      )?.value;
                      if (nextOutcome) {
                        field.handleChange(nextOutcome);
                      }
                    }}
                    value={field.state.value}
                  >
                    <SelectTrigger id="review-outcome">
                      <SelectValue placeholder="Chọn kết luận thẩm định" />
                    </SelectTrigger>
                    <SelectContent>
                      {OUTCOME_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </reviewForm.Field>

            <reviewForm.Field name="reasonCode">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="review-reason-code">
                    Mã phân loại kết luận
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
                </Field>
              )}
            </reviewForm.Field>

            <reviewForm.Subscribe selector={(state) => state.values.outcome}>
              {(outcome) =>
                outcome === "UNDER_REVIEW" ? null : (
                  <reviewForm.Field name="outcomeReason">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor="review-outcome-reason">
                            Lý do kết luận (Bắt buộc, thông báo cho Người bán){" "}
                            <span className="text-destructive">*</span>
                          </FieldLabel>
                          <Textarea
                            aria-invalid={isInvalid}
                            disabled={reviewMutation.isPending}
                            id="review-outcome-reason"
                            maxLength={2000}
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            placeholder="Nhập lý do chi tiết căn cứ đưa ra kết luận chấp thuận hoặc bác bỏ..."
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
                  </reviewForm.Field>
                )
              }
            </reviewForm.Subscribe>

            <reviewForm.Field name="adminNote">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="review-admin-note">
                      Ghi chú nội bộ (Tùy chọn)
                    </FieldLabel>
                    <Textarea
                      aria-invalid={isInvalid}
                      disabled={reviewMutation.isPending}
                      id="review-admin-note"
                      maxLength={5000}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="Ghi chú nội bộ quá trình thẩm định bằng chứng..."
                      rows={2}
                      value={field.state.value}
                    />
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                );
              }}
            </reviewForm.Field>
          </FieldGroup>

          <DialogFooter className="gap-2 pt-4 sm:justify-end">
            <Button
              disabled={reviewMutation.isPending}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Hủy
            </Button>
            <reviewForm.Subscribe
              selector={(state) => ({
                canSubmit: state.canSubmit,
                isSubmitting: state.isSubmitting,
                outcome: state.values.outcome,
              })}
            >
              {({ canSubmit, isSubmitting, outcome }) => (
                <Button
                  disabled={
                    !canSubmit || isSubmitting || reviewMutation.isPending
                  }
                  form="seller-appeal-review-form"
                  type="submit"
                  variant={outcome === "UPHELD" ? "destructive" : "default"}
                >
                  {isSubmitting || reviewMutation.isPending
                    ? "Đang lưu..."
                    : "Xác nhận kết luận"}
                </Button>
              )}
            </reviewForm.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
