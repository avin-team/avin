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
import { ShieldWarningIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { toast } from "sonner";

import { useSubmitSellerAppeal } from "../api/seller-enforcement-api";
import { sellerAppealFormSchema } from "../schemas/seller-appeal-form-schema";
import { SellerAppealEvidenceUploader } from "./seller-appeal-evidence-uploader";
import type { AppealEvidenceItem } from "./seller-appeal-evidence-uploader";

interface SellerAppealDialogProps {
  actionId: string;
  actionSummary?: {
    effectiveAt?: Date | string | null;
    newState?: string;
    reasonCode?: string;
    sellerReason?: string;
  };
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

const REASON_CODE_LABELS: Record<string, string> = {
  FINANCIAL_RISK: "Rủi ro tài chính / Thanh toán",
  FRAUD_RISK: "Nghi ngờ gian lận",
  FULFILLMENT_RISK: "Rủi ro thực hiện đơn hàng",
  OTHER: "Lý do khác",
  POLICY_VIOLATION: "Vi phạm chính sách sàn",
};

export const SellerAppealDialog = ({
  actionId,
  actionSummary,
  onOpenChange,
  open,
}: SellerAppealDialogProps) => {
  const [evidence, setEvidence] = useState<AppealEvidenceItem[]>([]);
  const submitMutation = useSubmitSellerAppeal();
  const appealForm = useForm({
    defaultValues: {
      sellerReason: "",
    },
    onSubmit: async ({ value }) => {
      const missingDescription = evidence.some(
        (item) => !item.description.trim()
      );
      if (missingDescription) {
        toast.error("Vui lòng mô tả từng tệp bằng chứng trước khi gửi.");
        return;
      }
      try {
        await submitMutation.mutateAsync({
          actionId,
          evidence: evidence.map((item) => ({
            byteSize: item.byteSize,
            contentType: item.contentType,
            description: item.description.trim(),
            fileName: item.fileName,
            storageKey: item.storageKey,
          })),
          idempotencyKey: crypto.randomUUID(),
          sellerReason: value.sellerReason.trim(),
        });
        toast.success("Gửi khiếu nại thành công", {
          description:
            "Ban quản trị sẽ xem xét giải trình và bằng chứng của bạn.",
        });
        appealForm.reset();
        setEvidence([]);
        onOpenChange(false);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Không thể gửi khiếu nại"
        );
      }
    },
    validators: { onSubmit: sellerAppealFormSchema },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      appealForm.reset();
      setEvidence([]);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <ShieldWarningIcon className="size-5" />
            <DialogTitle>Gửi khiếu nại quyết định xử lý (Appeal)</DialogTitle>
          </div>
          <DialogDescription>
            Nếu bạn cho rằng quyết định xử phạt này chưa chính xác, hãy gửi giải
            trình kèm tài liệu bằng chứng để Ban Quản Trị xem xét lại.
          </DialogDescription>
        </DialogHeader>

        {actionSummary ? (
          <div className="rounded-xl border border-muted bg-muted/40 p-3.5 text-xs">
            <p className="font-semibold text-foreground">
              Quyết định đang khiếu nại:{" "}
              <span className="text-destructive font-mono">
                {actionSummary.newState}
              </span>
            </p>
            {actionSummary.reasonCode ? (
              <p className="mt-1 text-muted-foreground">
                Phân loại vi phạm:{" "}
                <strong>
                  {REASON_CODE_LABELS[actionSummary.reasonCode] ??
                    actionSummary.reasonCode}
                </strong>
              </p>
            ) : null}
            {actionSummary.sellerReason ? (
              <p className="mt-1 text-muted-foreground">
                Lý do từ BQT: &ldquo;{actionSummary.sellerReason}&rdquo;
              </p>
            ) : null}
          </div>
        ) : null}

        <form
          className="grid gap-4 py-2"
          id="seller-appeal-form"
          onSubmit={async (event) => {
            event.preventDefault();
            event.stopPropagation();
            await appealForm.handleSubmit();
          }}
        >
          <FieldGroup>
            <appealForm.Field name="sellerReason">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Nội dung giải trình khiếu nại{" "}
                      <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Textarea
                      aria-invalid={isInvalid}
                      disabled={submitMutation.isPending}
                      id={field.name}
                      maxLength={2000}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="Trình bày rõ ràng lý do bạn khiếu nại quyết định này, thông tin đơn hàng đối chứng..."
                      rows={4}
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
            </appealForm.Field>
          </FieldGroup>

          <div className="grid gap-2 border-t pt-3">
            <SellerAppealEvidenceUploader
              actionId={actionId}
              disabled={submitMutation.isPending}
              onEvidenceChange={setEvidence}
            />
            {evidence.length > 0 ? (
              <p className="font-medium text-primary text-xs">
                Đã đính kèm {evidence.length} tệp tài liệu bằng chứng.
              </p>
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              disabled={submitMutation.isPending}
              onClick={() => handleOpenChange(false)}
              type="button"
              variant="outline"
            >
              Đóng
            </Button>
            <appealForm.Subscribe
              selector={(state) => ({
                canSubmit: state.canSubmit,
                isSubmitting: state.isSubmitting,
              })}
            >
              {({ canSubmit, isSubmitting }) => (
                <Button
                  disabled={
                    !canSubmit || isSubmitting || submitMutation.isPending
                  }
                  form="seller-appeal-form"
                  type="submit"
                >
                  {isSubmitting || submitMutation.isPending
                    ? "Đang gửi..."
                    : "Gửi khiếu nại"}
                </Button>
              )}
            </appealForm.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
