import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createNotificationEvent,
  listNotificationRecipientsByRole,
} from "../notifications/notification";
import { recordBalancedLedgerTransaction } from "../wallet/ledger";
import {
  ensureSellerWalletAccounts,
  ensureWalletAccounts,
} from "../wallet/service";
import { resolveEscrowHold } from "./escrow-resolution";
import type { EscrowResolutionContext } from "./escrow-resolution";
import type { CommerceExecutor } from "./executor";

vi.mock("../notifications/notification", () => ({
  createNotificationEvent: vi.fn(),
  listNotificationRecipientsByRole: vi.fn(),
}));

vi.mock("../wallet/ledger", () => ({
  recordBalancedLedgerTransaction: vi.fn(),
}));

vi.mock("../wallet/service", () => ({
  ensureSellerWalletAccounts: vi.fn(),
  ensureWalletAccounts: vi.fn(),
}));

const now = new Date("2026-08-12T00:00:00.000Z");

const heldEscrow: EscrowResolutionContext = {
  buyerId: "buyer-id",
  commissionRatePercent: "10",
  escrowAmount: 1000,
  escrowHoldId: "escrow-id",
  escrowHoldStatus: "HELD",
  orderId: "order-id",
  orderItemId: "order-item-id",
  sellerId: "seller-id",
};

const createQueryExecutor = (): CommerceExecutor => {
  const selectChain = {
    for: vi.fn(),
    from: vi.fn(),
    limit: vi.fn().mockResolvedValue([
      {
        availableBalance: 200,
        heldBalance: heldEscrow.escrowAmount,
      },
    ]),
    where: vi.fn(),
  };
  selectChain.from.mockReturnValue(selectChain);
  selectChain.where.mockReturnValue(selectChain);
  selectChain.for.mockReturnValue(selectChain);

  const walletUpdateChain = {
    returning: vi.fn().mockResolvedValue([{ heldBalance: 0 }]),
    set: vi.fn(),
    where: vi.fn(),
  };
  walletUpdateChain.set.mockReturnValue(walletUpdateChain);
  walletUpdateChain.where.mockReturnValue(walletUpdateChain);

  const escrowUpdateChain = {
    returning: vi.fn().mockResolvedValue([{ id: heldEscrow.escrowHoldId }]),
    set: vi.fn(),
    where: vi.fn(),
  };
  escrowUpdateChain.set.mockReturnValue(escrowUpdateChain);
  escrowUpdateChain.where.mockReturnValue(escrowUpdateChain);

  return {
    select: vi.fn().mockReturnValue(selectChain),
    update: vi
      .fn()
      .mockReturnValueOnce(walletUpdateChain)
      .mockReturnValueOnce(escrowUpdateChain),
  } as unknown as CommerceExecutor;
};

describe("resolveEscrowHold", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ensureWalletAccounts).mockResolvedValue({
      availableAccount: { id: "buyer-available-account" },
      heldAccount: { id: "buyer-held-account" },
      wallet: { id: "buyer-wallet" },
    } as Awaited<ReturnType<typeof ensureWalletAccounts>>);
    vi.mocked(ensureSellerWalletAccounts).mockResolvedValue({
      availableAccount: { id: "seller-available-account" },
      platformCommissionAccount: { id: "commission-account" },
    } as Awaited<ReturnType<typeof ensureSellerWalletAccounts>>);
    vi.mocked(recordBalancedLedgerTransaction).mockResolvedValue({
      id: "transaction-id",
    } as Awaited<ReturnType<typeof recordBalancedLedgerTransaction>>);
    vi.mocked(listNotificationRecipientsByRole).mockResolvedValue([]);
  });

  it("rejects an EscrowHold that was already resolved before doing I/O", async () => {
    const executor = createQueryExecutor();

    await expect(
      resolveEscrowHold({
        executor,
        item: { ...heldEscrow, escrowHoldStatus: "REFUNDED" },
        now,
        outcome: "REFUND",
      })
    ).rejects.toThrow("EscrowHold không còn ở trạng thái HELD.");

    expect(executor.select).not.toHaveBeenCalled();
    expect(recordBalancedLedgerTransaction).not.toHaveBeenCalled();
  });

  it("refunds through the shared interface and emits the committed refund notification", async () => {
    const executor = createQueryExecutor();

    await expect(
      resolveEscrowHold({ executor, item: heldEscrow, now, outcome: "REFUND" })
    ).resolves.toBe("transaction-id");

    expect(recordBalancedLedgerTransaction).toHaveBeenCalledWith(
      executor,
      expect.objectContaining({
        amount: heldEscrow.escrowAmount,
        type: "REFUND",
      })
    );
    expect(createNotificationEvent).toHaveBeenCalledWith(
      executor,
      expect.objectContaining({
        eventType: "transaction.refund_committed",
        sourceId: "transaction-id",
      })
    );
  });

  it("releases through the same interface and splits Seller proceeds from commission", async () => {
    const executor = createQueryExecutor();

    await expect(
      resolveEscrowHold({ executor, item: heldEscrow, now, outcome: "RELEASE" })
    ).resolves.toBe("transaction-id");

    expect(recordBalancedLedgerTransaction).toHaveBeenCalledWith(
      executor,
      expect.objectContaining({
        amount: heldEscrow.escrowAmount,
        postings: [
          expect.objectContaining({ debitAmount: 1000 }),
          expect.objectContaining({ creditAmount: 900 }),
          expect.objectContaining({ creditAmount: 100 }),
        ],
        type: "ESCROW_RELEASE",
      })
    );
    expect(createNotificationEvent).not.toHaveBeenCalled();
  });
});
