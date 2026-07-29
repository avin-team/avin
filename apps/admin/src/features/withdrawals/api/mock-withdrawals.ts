import { useSyncExternalStore } from "react";

import type { WithdrawalRequest, WithdrawalStatus } from "../types";
import { updateWithdrawalStatus } from "../workflow";

const INITIAL_WITHDRAWALS: readonly WithdrawalRequest[] = [
  {
    amountVnd: 15_000_000,
    applicantName: "Trần Minh Quang",
    bankAccount: {
      accountName: "TRAN MINH QUANG",
      accountNumber: "0912345678",
      bankName: "MBBank",
    },
    id: "wth_2026_01",
    requestedAt: "2026-07-29T11:30:00Z",
    sellerId: "seller_dev_master",
    status: "PENDING",
    storefrontName: "DevTools Vietnam Store",
  },
  {
    amountVnd: 3_500_000,
    applicantName: "Lê Văn Hùng",
    bankAccount: {
      accountName: "LE VAN HUNG",
      accountNumber: "1019887766",
      bankName: "Vietcombank",
    },
    id: "wth_2026_02",
    processedAt: "2026-07-28T14:00:00Z",
    requestedAt: "2026-07-28T09:15:00Z",
    sellerId: "seller_game_key",
    status: "APPROVED",
    storefrontName: "GameKey Studio",
  },
  {
    amountVnd: 20_000_000,
    applicantName: "Trần Minh Quang",
    bankAccount: {
      accountName: "TRAN MINH QUANG",
      accountNumber: "0912345678",
      bankName: "MBBank",
    },
    bankTransactionRef: "FT2620198823",
    id: "wth_2026_03",
    note: "Đã chuyển tiền qua VietQR thành công",
    processedAt: "2026-07-20T16:30:00Z",
    requestedAt: "2026-07-20T10:00:00Z",
    sellerId: "seller_dev_master",
    status: "PAID",
    storefrontName: "DevTools Vietnam Store",
  },
];

let withdrawalsState: readonly WithdrawalRequest[] = INITIAL_WITHDRAWALS;
const listeners = new Set<() => void>();

const emitChange = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

export const useWithdrawals = (): readonly WithdrawalRequest[] =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => withdrawalsState,
    () => INITIAL_WITHDRAWALS
  );

export const processWithdrawalAction = (
  withdrawalId: string,
  newStatus: WithdrawalStatus,
  bankTransactionRef?: string,
  note?: string
): void => {
  const request = withdrawalsState.find((w) => w.id === withdrawalId);
  if (!request) {
    throw new Error("Không tìm thấy yêu cầu rút tiền");
  }

  const updated = updateWithdrawalStatus(
    request,
    newStatus,
    bankTransactionRef,
    note
  );

  withdrawalsState = withdrawalsState.map((w) =>
    w.id === withdrawalId ? updated : w
  );

  emitChange();
};
