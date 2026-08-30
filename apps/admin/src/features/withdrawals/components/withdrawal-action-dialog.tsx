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
import { Input } from "@avin/ui/components/input";
import { Textarea } from "@avin/ui/components/textarea";
import { useForm } from "@tanstack/react-form";

import { createWithdrawalActionFormSchema } from "../schemas/withdrawal-action-form-schema";
import type { AdminWithdrawal, WithdrawalAction } from "../types";

const ACTION_COPY: Record<
  WithdrawalAction,
  { description: string; title: string }
> = {
  APPROVE: {
    description:
      "Xác nhận thông tin tài khoản đã chụp tại thời điểm Seller gửi yêu cầu.",
    title: "Duyệt yêu cầu rút tiền?",
  },
  MARK_PAID: {
    description:
      "Chỉ xác nhận sau khi đã chuyển khoản cho tài khoản ngân hàng được chụp bên dưới.",
    title: "Xác nhận đã chuyển khoản?",
  },
  REJECT: {
    description:
      "Lý do sẽ được gửi cho Seller và số dư sẽ được trả lại Available Balance.",
    title: "Từ chối yêu cầu rút tiền?",
  },
};

export const WithdrawalActionDialog = ({
  action,
  onConfirm,
  onOpenChange,
  open,
  pending,
  request,
}: {
  action: WithdrawalAction | null;
  onConfirm: (value?: string) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  pending: boolean;
  request: AdminWithdrawal | null;
}) => {
  const actionForm = useForm({
    defaultValues: { value: "" },
    onSubmit: ({ value }) => {
      onConfirm(value.value.trim() || undefined);
      actionForm.reset();
    },
    validators: {
      onSubmit: createWithdrawalActionFormSchema(action),
    },
  });

  if (!action || !request) {
    return null;
  }

  const isReason = action === "REJECT";
  const isPaymentReference = action === "MARK_PAID";
  const copy = ACTION_COPY[action];

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !pending) {
          actionForm.reset();
        }
        onOpenChange(nextOpen);
      }}
      open={open}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <div className="rounded-lg bg-muted p-3 text-sm">
          <p className="font-semibold">
            {request.amount.toLocaleString("vi-VN")} ₫ ·{" "}
            {request.bankAccount.bankName}
          </p>
          <p className="mt-1 text-muted-foreground">
            {request.bankAccount.accountNumber} ·{" "}
            {request.bankAccount.accountName}
          </p>
        </div>

        <form
          id="withdrawal-action-form"
          onSubmit={async (event) => {
            event.preventDefault();
            event.stopPropagation();
            await actionForm.handleSubmit();
          }}
        >
          {isReason || isPaymentReference ? (
            <FieldGroup>
              <actionForm.Field name="value">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor="withdrawal-action-value">
                        {isReason ? "Lý do từ chối" : "Mã giao dịch ngân hàng"}
                      </FieldLabel>
                      {isReason ? (
                        <Textarea
                          aria-invalid={isInvalid}
                          disabled={pending}
                          id="withdrawal-action-value"
                          name={field.name}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          value={field.state.value}
                        />
                      ) : (
                        <Input
                          aria-invalid={isInvalid}
                          disabled={pending}
                          id="withdrawal-action-value"
                          name={field.name}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          value={field.state.value}
                        />
                      )}
                      {isInvalid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : null}
                    </Field>
                  );
                }}
              </actionForm.Field>
            </FieldGroup>
          ) : null}

          <DialogFooter className="pt-4">
            <Button
              disabled={pending}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Hủy
            </Button>
            <actionForm.Subscribe
              selector={(state) => ({
                canSubmit: state.canSubmit,
                isSubmitting: state.isSubmitting,
              })}
            >
              {({ canSubmit, isSubmitting }) => (
                <Button
                  disabled={pending || isSubmitting || !canSubmit}
                  form="withdrawal-action-form"
                  type="submit"
                  variant={isReason ? "destructive" : "default"}
                >
                  {pending || isSubmitting ? "Đang xử lý..." : "Xác nhận"}
                </Button>
              )}
            </actionForm.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
