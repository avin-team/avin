import type { WithdrawalRequest, WithdrawalStatus } from "./types";

export const MIN_WITHDRAWAL_AMOUNT_VND = 5000;

export function validateWithdrawalAmount(amountVnd: number): void {
  if (amountVnd < MIN_WITHDRAWAL_AMOUNT_VND) {
    throw new Error(
      `Số tiền rút tối thiểu là ${MIN_WITHDRAWAL_AMOUNT_VND.toLocaleString("vi-VN")} đ`
    );
  }
}

export function updateWithdrawalStatus(
  request: WithdrawalRequest,
  newStatus: WithdrawalStatus,
  bankTransactionRef?: string,
  note?: string
): WithdrawalRequest {
  if (request.status === "PAID" || request.status === "REJECTED") {
    throw new Error(`Yêu cầu rút tiền đã hoàn tất (${request.status})`);
  }

  if (newStatus === "PAID") {
    const trimmedRef = bankTransactionRef?.trim() ?? "";
    if (trimmedRef.length === 0) {
      throw new Error(
        "Mã giao dịch ngân hàng (Bank Transaction Ref) là bắt buộc khi hoàn tất chuyển khoản"
      );
    }
  }

  if (newStatus === "REJECTED") {
    const trimmedNote = note?.trim() ?? "";
    if (trimmedNote.length === 0) {
      throw new Error("Lý do từ chối yêu cầu rút tiền là bắt buộc");
    }
  }

  const now = new Date().toISOString();

  return {
    ...request,
    bankTransactionRef:
      bankTransactionRef?.trim() || request.bankTransactionRef,
    note: note?.trim() || request.note,
    processedAt: now,
    status: newStatus,
  };
}
