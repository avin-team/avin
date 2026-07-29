import { describe, expect, it } from "vitest";

import type { WithdrawalRequest } from "./types";
import {
  MIN_WITHDRAWAL_AMOUNT_VND,
  updateWithdrawalStatus,
  validateWithdrawalAmount,
} from "./workflow";

describe("Withdrawal workflow", () => {
  const mockRequest: WithdrawalRequest = {
    amountVnd: 5_000_000,
    applicantName: "Trần Minh Quang",
    bankAccount: {
      accountName: "TRAN MINH QUANG",
      accountNumber: "0912345678",
      bankName: "MBBank",
    },
    id: "wth_1",
    requestedAt: "2026-07-29T08:00:00Z",
    sellerId: "seller_1",
    status: "PENDING",
    storefrontName: "DevTools Vietnam Store",
  };

  it("validates minimum withdrawal limit", () => {
    expect(() => validateWithdrawalAmount(4999)).toThrow(
      `Số tiền rút tối thiểu là ${MIN_WITHDRAWAL_AMOUNT_VND.toLocaleString("vi-VN")} đ`
    );
    expect(() => validateWithdrawalAmount(5000)).not.toThrow();
  });

  it("requires bank reference for PAID status", () => {
    expect(() => updateWithdrawalStatus(mockRequest, "PAID", "")).toThrow(
      "Mã giao dịch ngân hàng (Bank Transaction Ref) là bắt buộc khi hoàn tất chuyển khoản"
    );
  });

  it("requires rejection reason for REJECTED status", () => {
    expect(() =>
      updateWithdrawalStatus(mockRequest, "REJECTED", undefined, "")
    ).toThrow("Lý do từ chối yêu cầu rút tiền là bắt buộc");
  });

  it("successfully updates status to APPROVED and PAID", () => {
    const approved = updateWithdrawalStatus(mockRequest, "APPROVED");
    expect(approved.status).toBe("APPROVED");

    const paid = updateWithdrawalStatus(approved, "PAID", "FT26219901");
    expect(paid.status).toBe("PAID");
    expect(paid.bankTransactionRef).toBe("FT26219901");
  });
});
