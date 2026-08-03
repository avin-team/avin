import { ledgerAccount, ledgerPosting } from "@avin/db/schema/wallet";
import { describe, expect, it, vi } from "vitest";

import type { WalletExecutor } from "./ledger";
import { getWalletTransactions } from "./service";

const createHistoryExecutor = ({
  ledgerRows,
  heldOnlyRows = [],
  pendingRows,
}: {
  heldOnlyRows?: unknown[];
  ledgerRows: unknown[];
  pendingRows: unknown[];
}): WalletExecutor => {
  const select = vi.fn(() => {
    let source: unknown;

    const query = {
      as: () => query,
      from: (table: unknown) => {
        source = table;
        return query;
      },
      innerJoin: () => query,
      leftJoin: () => query,
      limit: () => {
        let rows = pendingRows;
        if (source === ledgerPosting) {
          rows = ledgerRows;
        } else if (source === ledgerAccount) {
          rows = heldOnlyRows;
        }
        return Object.assign(Promise.resolve(rows), { as: () => query });
      },
      orderBy: () => query,
      where: () => query,
    };

    return query;
  });

  return { select } as unknown as WalletExecutor;
};

describe("wallet transaction history", () => {
  it("merges completed ledger events and observed deposits into one buyer timeline", async () => {
    const result = await getWalletTransactions(
      createHistoryExecutor({
        heldOnlyRows: [
          {
            amount: 10_000,
            balanceAfter: null,
            createdAt: new Date("2026-08-02T09:59:00.000Z"),
            creditAmount: 0,
            currency: "VND",
            debitAmount: 10_000,
            depositPaymentCode: null,
            depositRequestId: null,
            id: "ledger-release-1",
            reference: "AVTX-RELEASE",
            type: "ESCROW_RELEASE",
          },
        ],
        ledgerRows: [
          {
            amount: 50_000,
            balanceAfter: 99_000,
            createdAt: new Date("2026-08-02T10:02:00.000Z"),
            creditAmount: 50_000,
            currency: "VND",
            debitAmount: 0,
            depositPaymentCode: "AVCREDIT123456",
            depositRequestId: "request-credited",
            id: "ledger-deposit-1",
            reference: "AVTX-CREDITED",
            type: "DEPOSIT",
          },
          {
            amount: 10_000,
            balanceAfter: 89_000,
            createdAt: new Date("2026-08-02T10:01:00.000Z"),
            creditAmount: 0,
            currency: "VND",
            debitAmount: 10_000,
            depositPaymentCode: null,
            depositRequestId: null,
            id: "ledger-purchase-1",
            reference: "AVTX-PURCHASE",
            type: "PURCHASE_HOLD",
          },
        ],
        pendingRows: [
          {
            amount: 24_000,
            createdAt: new Date("2026-08-02T10:00:00.000Z"),
            currency: "VND",
            eventId: "event-mismatch",
            eventPaymentCode: "AVPENDING1234",
            eventStatus: "UNMATCHED",
            id: "request-pending",
            requestPaymentCode: "AVPENDING1234",
            transferType: "in",
          },
          {
            amount: 15_000,
            createdAt: new Date("2026-08-02T09:58:00.000Z"),
            currency: "VND",
            eventId: "event-received",
            eventPaymentCode: "AVRECEIVED123",
            eventStatus: "RECEIVED",
            id: "request-observed",
            requestPaymentCode: "AVRECEIVED123",
            transferType: "in",
          },
          {
            amount: 7000,
            createdAt: new Date("2026-08-02T09:57:00.000Z"),
            currency: "VND",
            eventId: "event-duplicate",
            eventPaymentCode: "AVCREDIT123456",
            eventStatus: "UNMATCHED",
            id: "request-credited-again",
            requestPaymentCode: "AVCREDIT123456",
            transferType: "in",
          },
        ],
      }),
      "user-1"
    );

    expect(result).toEqual({
      items: [
        {
          amount: 50_000,
          currency: "VND",
          id: "deposit:request-credited",
          paymentReference: "AVCREDIT123456",
          resultingAvailableBalance: 99_000,
          status: "COMPLETED",
          timestamp: "2026-08-02T10:02:00.000Z",
          type: "Nạp tiền",
        },
        {
          amount: -10_000,
          currency: "VND",
          id: "transaction:ledger-purchase-1",
          paymentReference: "AVTX-PURCHASE",
          resultingAvailableBalance: 89_000,
          status: "COMPLETED",
          timestamp: "2026-08-02T10:01:00.000Z",
          type: "Thanh toán đơn hàng",
        },
        {
          amount: 24_000,
          currency: "VND",
          id: "deposit-event:event-mismatch",
          paymentReference: "AVPENDING1234",
          resultingAvailableBalance: null,
          status: "ATTENTION",
          timestamp: "2026-08-02T10:00:00.000Z",
          type: "Nạp tiền",
        },
        {
          amount: -10_000,
          currency: "VND",
          id: "transaction:ledger-release-1",
          paymentReference: "AVTX-RELEASE",
          resultingAvailableBalance: null,
          status: "COMPLETED",
          timestamp: "2026-08-02T09:59:00.000Z",
          type: "Giải ngân ký quỹ",
        },
        {
          amount: 15_000,
          currency: "VND",
          id: "deposit-event:event-received",
          paymentReference: "AVRECEIVED123",
          resultingAvailableBalance: null,
          status: "PENDING",
          timestamp: "2026-08-02T09:58:00.000Z",
          type: "Nạp tiền",
        },
        {
          amount: 7000,
          currency: "VND",
          id: "deposit-event:event-duplicate",
          paymentReference: "AVCREDIT123456",
          resultingAvailableBalance: null,
          status: "ATTENTION",
          timestamp: "2026-08-02T09:57:00.000Z",
          type: "Nạp tiền",
        },
      ],
      nextCursor: null,
    });
  });
});
