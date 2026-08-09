import { Button } from "@avin/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@avin/ui/components/dialog";
import { Field, FieldGroup, FieldLabel } from "@avin/ui/components/field";
import { Input } from "@avin/ui/components/input";
import { Textarea } from "@avin/ui/components/textarea";
import { useState } from "react";

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
  const [value, setValue] = useState("");
  if (!action || !request) {
    return null;
  }
  const isReason = action === "REJECT";
  const isPaymentReference = action === "MARK_PAID";
  const copy = ACTION_COPY[action];
  const valid = (!isReason && !isPaymentReference) || value.trim().length > 0;
  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setValue("");
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
        {isReason || isPaymentReference ? (
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="withdrawal-action-value">
                {isReason ? "Lý do từ chối" : "Mã giao dịch ngân hàng"}
              </FieldLabel>
              {isReason ? (
                <Textarea
                  id="withdrawal-action-value"
                  onChange={(event) => setValue(event.target.value)}
                  value={value}
                />
              ) : (
                <Input
                  id="withdrawal-action-value"
                  onChange={(event) => setValue(event.target.value)}
                  value={value}
                />
              )}
            </Field>
          </FieldGroup>
        ) : null}
        <DialogFooter>
          <Button
            disabled={pending}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Hủy
          </Button>
          <Button
            disabled={pending || !valid}
            onClick={() => onConfirm(value.trim() || undefined)}
            type="button"
            variant={isReason ? "destructive" : "default"}
          >
            {pending ? "Đang xử lý..." : "Xác nhận"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
