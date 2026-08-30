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
import { Textarea } from "@avin/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";

import { useResolveDispute } from "../api/disputes-api";
import { disputeResolutionFormSchema } from "../schemas/dispute-resolution-form-schema";
import type { Dispute, DisputeResolutionOutcome } from "../types";

interface Props {
  readonly dispute: Dispute | null;
  readonly outcome: DisputeResolutionOutcome | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export const DisputeResolutionDialog = ({
  dispute,
  outcome,
  open,
  onOpenChange,
}: Props) => {
  const resolveMutation = useResolveDispute();
  const isRefund = outcome === "RESOLVED_REFUNDED";
  const resolutionForm = useForm({
    defaultValues: { adminMessage: "", note: "" },
    onSubmit: async ({ value }) => {
      if (!dispute || !outcome) {
        return;
      }
      try {
        await resolveMutation.mutateAsync({
          adminMessage: value.adminMessage.trim(),
          commandKey: crypto.randomUUID(),
          disputeId: dispute.id,
          note: value.note.trim(),
          outcome,
        });
        toast.success(
          isRefund
            ? "Đã đưa ra quyết định Hoàn tiền 100% cho Buyer"
            : "Đã đưa ra quyết định Giải ngân 100% cho Seller",
          {
            description: `Mã đơn: ${dispute.itemSnapshot.orderId}`,
          }
        );
        resolutionForm.reset();
        onOpenChange(false);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Thao tác thất bại"
        );
      }
    },
    validators: { onSubmit: disputeResolutionFormSchema },
  });

  if (!dispute || !outcome) {
    return null;
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resolutionForm.reset();
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isRefund
              ? "Quyết định HOÀN TIỀN (Full Refund to Buyer)"
              : "Quyết định GIẢI NGÂN (Full Escrow Release to Seller)"}
          </DialogTitle>
          <DialogDescription>
            {isRefund
              ? `Hoàn lại 100% số tiền ${dispute.itemSnapshot.totalAmountVnd.toLocaleString("vi-VN")} đ từ EscrowHold về ví Buyer (${dispute.buyerName}).`
              : `Giải ngân 100% số tiền ${dispute.itemSnapshot.totalAmountVnd.toLocaleString("vi-VN")} đ (trừ chiết khấu sàn) về ví Seller (${dispute.sellerStorefrontName}).`}
          </DialogDescription>
        </DialogHeader>

        <form
          id="dispute-resolution-form"
          onSubmit={async (event) => {
            event.preventDefault();
            event.stopPropagation();
            await resolutionForm.handleSubmit();
          }}
        >
          <FieldGroup className="gap-4 py-4">
            <resolutionForm.Field name="note">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Ghi chú quyết định của Admin (Bắt buộc cho Hồ sơ Audit)
                    </FieldLabel>
                    <Textarea
                      aria-invalid={isInvalid}
                      id={field.name}
                      maxLength={5000}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="Ghi rõ lý do căn cứ theo chứng cứ hai bên cung cấp..."
                      rows={3}
                      value={field.state.value}
                    />
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                );
              }}
            </resolutionForm.Field>
            <resolutionForm.Field name="adminMessage">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>
                    Tin nhắn phân giải công khai gửi vào chat Đơn Hàng (Tùy
                    chọn)
                  </FieldLabel>
                  <Textarea
                    id={field.name}
                    maxLength={2000}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="VD: Admin đã kiểm tra chứng cứ và quyết định hoàn tiền..."
                    rows={2}
                    value={field.state.value}
                  />
                </Field>
              )}
            </resolutionForm.Field>
          </FieldGroup>

          <DialogFooter>
            <Button
              onClick={() => handleOpenChange(false)}
              type="button"
              variant="outline"
            >
              Hủy
            </Button>
            <resolutionForm.Subscribe
              selector={(state) => ({
                canSubmit: state.canSubmit,
                isSubmitting: state.isSubmitting,
              })}
            >
              {({ canSubmit, isSubmitting }) => (
                <Button
                  disabled={
                    !canSubmit || isSubmitting || resolveMutation.isPending
                  }
                  form="dispute-resolution-form"
                  type="submit"
                  variant={isRefund ? "destructive" : "default"}
                >
                  {isSubmitting || resolveMutation.isPending
                    ? "Đang xử lý…"
                    : `Xác nhận ${isRefund ? "Hoàn Tiền" : "Giải Ngân"}`}
                </Button>
              )}
            </resolutionForm.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
