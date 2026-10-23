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
import { Check, Copy } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { toast } from "sonner";

import { createWithdrawalActionFormSchema } from "../schemas/withdrawal-action-form-schema";
import type { AdminWithdrawal, WithdrawalAction } from "../types";
import { getWithdrawalQrUrl } from "../utils/vietqr";

const ACTION_COPY: Record<
  WithdrawalAction,
  { description: string; title: string }
> = {
  APPROVE: {
    description:
      "Xác nhận duyệt yêu cầu và quét mã VietQR để chuyển tiền cho Seller.",
    title: "Duyệt yêu cầu rút tiền?",
  },
  MARK_PAID: {
    description:
      "Quét mã VietQR chuyển khoản bên dưới, sau đó nhập mã giao dịch để xác nhận đã thanh toán.",
    title: "Xác nhận đã chuyển khoản?",
  },
  REJECT: {
    description:
      "Lý do sẽ được gửi cho Seller và số dư sẽ được trả lại Available Balance.",
    title: "Từ chối yêu cầu rút tiền?",
  },
  VIEW_QR: {
    description:
      "Quét mã VietQR bằng app ngân hàng bất kỳ để chuyển tiền nhanh cho Seller.",
    title: "Mã VietQR chuyển khoản",
  },
};

const CopyableRow = ({
  copyKey,
  copyValue,
  copiedKey,
  label,
  onCopy,
  value,
}: {
  copyKey: string;
  copyValue: string;
  copiedKey: string | null;
  label: string;
  onCopy: (text: string, label: string, key: string) => void;
  value: string;
}) => (
  <div className="flex items-center justify-between text-xs">
    <span className="text-muted-foreground">{label}</span>
    <div className="flex items-center gap-1.5 font-medium">
      <span className="font-mono">{value}</span>
      <Button
        aria-label={`Sao chép ${label}`}
        className="size-6 text-muted-foreground hover:text-foreground"
        onClick={() => onCopy(copyValue, label, copyKey)}
        size="icon-xs"
        type="button"
        variant="ghost"
      >
        {copiedKey === copyKey ? (
          <Check className="size-3.5 text-emerald-500" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </Button>
    </div>
  </div>
);

const WithdrawalQrSection = ({ request }: { request: AdminWithdrawal }) => (
  <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-3">
    <div className="rounded-xl bg-white p-2 shadow-sm">
      <img
        alt={`VietQR ${request.bankAccount.bankName}`}
        className="size-56 object-contain"
        src={getWithdrawalQrUrl(request)}
      />
    </div>
    <p className="text-center text-xs text-muted-foreground">
      Quét mã bằng app ngân hàng để chuyển tiền nhanh với đầy đủ số tiền &amp;
      nội dung
    </p>
  </div>
);

const WithdrawalBankDetailsSection = ({
  copiedKey,
  onCopy,
  request,
}: {
  copiedKey: string | null;
  onCopy: (text: string, label: string, key: string) => void;
  request: AdminWithdrawal;
}) => (
  <div className="space-y-1.5 rounded-lg bg-muted/60 p-3 text-sm">
    <CopyableRow
      copiedKey={copiedKey}
      copyKey="bank"
      copyValue={request.bankAccount.bankName}
      label="Ngân hàng"
      onCopy={onCopy}
      value={request.bankAccount.bankName}
    />
    <CopyableRow
      copiedKey={copiedKey}
      copyKey="accountNumber"
      copyValue={request.bankAccount.accountNumber}
      label="Số tài khoản"
      onCopy={onCopy}
      value={request.bankAccount.accountNumber}
    />
    <CopyableRow
      copiedKey={copiedKey}
      copyKey="accountName"
      copyValue={request.bankAccount.accountName}
      label="Chủ tài khoản"
      onCopy={onCopy}
      value={request.bankAccount.accountName}
    />
    <CopyableRow
      copiedKey={copiedKey}
      copyKey="amount"
      copyValue={String(request.amount)}
      label="Số tiền"
      onCopy={onCopy}
      value={`${request.amount.toLocaleString("vi-VN")} ₫`}
    />
    <CopyableRow
      copiedKey={copiedKey}
      copyKey="content"
      copyValue="AVIN RUT TIEN"
      label="Nội dung CK"
      onCopy={onCopy}
      value="AVIN RUT TIEN"
    />
  </div>
);

const resolveButtonLabel = (
  action: WithdrawalAction,
  pending: boolean,
  isSubmitting: boolean
): string => {
  if (pending || isSubmitting) {
    return "Đang xử lý...";
  }
  if (action === "APPROVE") {
    return "Xác nhận duyệt";
  }
  return "Xác nhận";
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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = async (text: string, label: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success(`Đã sao chép ${label}.`);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast.error(`Không thể sao chép ${label}.`);
    }
  };

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
  const isViewQr = action === "VIEW_QR";
  const showQr = action === "APPROVE" || action === "MARK_PAID" || isViewQr;
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
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        {showQr ? <WithdrawalQrSection request={request} /> : null}

        <WithdrawalBankDetailsSection
          copiedKey={copiedKey}
          onCopy={copyToClipboard}
          request={request}
        />

        {isViewQr ? (
          <DialogFooter className="pt-2">
            <Button onClick={() => onOpenChange(false)} type="button">
              Đóng
            </Button>
          </DialogFooter>
        ) : (
          <form
            id="withdrawal-action-form"
            onSubmit={async (event) => {
              event.preventDefault();
              event.stopPropagation();
              await actionForm.handleSubmit();
            }}
          >
            {isReason || isPaymentReference ? (
              <FieldGroup className="mt-3">
                <actionForm.Field name="value">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor="withdrawal-action-value">
                          {isReason
                            ? "Lý do từ chối"
                            : "Mã giao dịch ngân hàng (tùy chọn)"}
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
                            placeholder="Nhập lý do gửi về cho Seller..."
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
                            placeholder="VD: FT123456789... (không bắt buộc)"
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
                    {resolveButtonLabel(action, pending, isSubmitting)}
                  </Button>
                )}
              </actionForm.Subscribe>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
