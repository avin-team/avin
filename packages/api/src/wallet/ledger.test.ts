import { ledgerPosting, ledgerTransaction } from "@avin/db/schema/wallet";
import { describe, expect, it, vi } from "vitest";

import { recordBalancedLedgerTransaction } from "./ledger";
import type { WalletExecutor } from "./ledger";

const createLedgerExecutor = (balanceUpdates = [900, 1100]): WalletExecutor => {
  const insert = vi.fn((table: unknown) => {
    if (table === ledgerTransaction) {
      return {
        values: () => ({
          returning: () => [{ id: "transaction-1", reference: "ref-1" }],
        }),
      };
    }

    if (table === ledgerPosting) {
      return { values: () => [] };
    }

    return { values: () => [] };
  });
  const select = vi.fn(() => ({
    from: () => ({
      where: () => ({
        limit: () => [{ balanceAmount: 1000, balanceSide: "CREDIT" as const }],
      }),
    }),
  }));
  const update = vi.fn(() => ({
    set: () => ({
      where: () => ({
        returning: () => {
          const balanceAmount = balanceUpdates.shift();
          return balanceAmount === undefined ? [] : [{ balanceAmount }];
        },
      }),
    }),
  }));

  return { insert, select, update } as unknown as WalletExecutor;
};

describe("recordBalancedLedgerTransaction", () => {
  it("records balanced postings with each account's resulting balance", async () => {
    const result = await recordBalancedLedgerTransaction(
      createLedgerExecutor(),
      {
        amount: 100,
        postings: [
          { accountId: "available", debitAmount: 100 },
          { accountId: "held", creditAmount: 100 },
        ],
        reference: "ref-1",
        type: "PURCHASE_HOLD",
      }
    );

    expect(result).toEqual({
      id: "transaction-1",
      postings: [
        {
          accountId: "available",
          balanceAfter: 900,
          creditAmount: 0,
          debitAmount: 100,
        },
        {
          accountId: "held",
          balanceAfter: 1100,
          creditAmount: 100,
          debitAmount: 0,
        },
      ],
      reference: "ref-1",
    });
  });

  it("rejects an unbalanced transaction before writing ledger rows", async () => {
    const executor = createLedgerExecutor();

    await expect(
      recordBalancedLedgerTransaction(executor, {
        amount: 100,
        postings: [
          { accountId: "available", debitAmount: 100 },
          { accountId: "held", creditAmount: 90 },
        ],
        reference: "ref-2",
        type: "PURCHASE_HOLD",
      })
    ).rejects.toThrow("must be balanced");
    expect(executor.insert).not.toHaveBeenCalled();
  });
});
