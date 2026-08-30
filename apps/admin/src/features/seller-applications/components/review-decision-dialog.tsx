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
import { Spinner } from "@avin/ui/components/spinner";
import { Textarea } from "@avin/ui/components/textarea";
import { useForm } from "@tanstack/react-form";

import { reviewDecisionFormSchema } from "../schemas/review-decision-form-schema";
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
  const requiresReason = decision !== null && decision !== "APPROVED";
  const reviewForm = useForm({
    defaultValues: { reason: "" },
    onSubmit: ({ value }) => {
      if (!decision) {
        return;
      }
      onConfirm(requiresReason ? value.reason.trim() : undefined);
      reviewForm.reset();
    },
    validators: { onSubmit: reviewDecisionFormSchema },
  });

  if (!decision) {
    return null;
  }

  const copy = DECISION_COPY[decision];

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          reviewForm.reset();
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
        <form
          id="review-decision-form"
          onSubmit={async (event) => {
            event.preventDefault();
            event.stopPropagation();
            await reviewForm.handleSubmit();
          }}
        >
          {requiresReason ? (
            <FieldGroup className="gap-2 py-2">
              <reviewForm.Field name="reason">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>
                        Lý do (Bắt buộc)
                      </FieldLabel>
                      <Textarea
                        aria-invalid={isInvalid}
                        disabled={isPending}
                        id={field.name}
                        maxLength={2000}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="Giải thích chi tiết những thông tin cần bổ sung hoặc lý do từ chối..."
                        rows={3}
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
          ) : null}
          <DialogFooter>
            <Button
              disabled={isPending}
              onClick={() => onOpenChange(false)}
              variant="outline"
            >
              Hủy
            </Button>
            <reviewForm.Subscribe
              selector={(state) => ({
                canSubmit: state.canSubmit,
                isSubmitting: state.isSubmitting,
              })}
            >
              {({ canSubmit, isSubmitting }) => (
                <Button
                  disabled={
                    isPending || isSubmitting || (requiresReason && !canSubmit)
                  }
                  form="review-decision-form"
                  type="submit"
                  variant={decision === "REJECTED" ? "destructive" : "default"}
                >
                  {(isPending || isSubmitting) && (
                    <Spinner data-icon="inline-start" />
                  )}
                  Xác nhận
                </Button>
              )}
            </reviewForm.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
