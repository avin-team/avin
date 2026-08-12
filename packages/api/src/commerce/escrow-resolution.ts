import { escrowHold } from "@avin/db/schema/commerce";
import { userWallet } from "@avin/db/schema/wallet";
import { ORPCError } from "@orpc/server";
import { and, eq, gte } from "drizzle-orm";

import {
  createNotificationEvent,
  listNotificationRecipientsByRole,
} from "../notifications/notification";
import { recordBalancedLedgerTransaction } from "../wallet/ledger";
import {
  ensureSellerWalletAccounts,
  ensureWalletAccounts,
} from "../wallet/service";
import { calculateEscrowReleaseAmounts } from "./commission";
import type { CommerceExecutor } from "./executor";

const TRANSACTION_REFERENCE_SUFFIX_LENGTH = 12;

export type EscrowResolutionOutcome = "REFUND" | "RELEASE";

export interface EscrowResolutionContext {
  buyerId: string;
  commissionRatePercent: string;
  escrowAmount: number;
  escrowHoldId: string;
  escrowHoldStatus: "CANCELLED" | "HELD" | "REFUNDED" | "RELEASED";
  orderId: string;
  orderItemId: string;
  sellerId: string;
}

const throwConflict = (message: string): never => {
  throw new ORPCError("CONFLICT", { message });
};

const createTransactionReference = (
  prefix: "REFUND" | "RELEASE",
  orderItemId: string
): string =>
  `AVTX-${prefix}-${orderItemId}-${crypto
    .randomUUID()
    .replaceAll("-", "")
    .slice(0, TRANSACTION_REFERENCE_SUFFIX_LENGTH)
    .toUpperCase()}`;

const refundEscrowHold = async (
  executor: CommerceExecutor,
  item: EscrowResolutionContext,
  now: Date
): Promise<string> => {
  const accounts = await ensureWalletAccounts(executor, item.buyerId);
  const [wallet] = await executor
    .select()
    .from(userWallet)
    .where(eq(userWallet.id, accounts.wallet.id))
    .for("update")
    .limit(1);
  if (!wallet || wallet.heldBalance < item.escrowAmount) {
    return throwConflict("Held Balance của Buyer không đủ để hoàn tiền.");
  }

  const [refundTransaction] = await Promise.all([
    recordBalancedLedgerTransaction(executor, {
      amount: item.escrowAmount,
      description: `REFUND ORDER_ITEM ${item.orderItemId}`,
      postings: [
        {
          accountId: accounts.heldAccount.id,
          debitAmount: item.escrowAmount,
        },
        {
          accountId: accounts.availableAccount.id,
          creditAmount: item.escrowAmount,
        },
      ],
      reference: createTransactionReference("REFUND", item.orderItemId),
      type: "REFUND",
    }),
    (async () => {
      const [walletAfterUpdate] = await executor
        .update(userWallet)
        .set({
          availableBalance: wallet.availableBalance + item.escrowAmount,
          heldBalance: wallet.heldBalance - item.escrowAmount,
          updatedAt: now,
        })
        .where(
          and(
            eq(userWallet.id, accounts.wallet.id),
            gte(userWallet.heldBalance, item.escrowAmount)
          )
        )
        .returning({
          availableBalance: userWallet.availableBalance,
          heldBalance: userWallet.heldBalance,
        });
      if (!walletAfterUpdate) {
        throwConflict("Số dư Buyer vừa thay đổi. Vui lòng thử lại.");
      }
      return walletAfterUpdate;
    })(),
    (async () => {
      const [updatedHold] = await executor
        .update(escrowHold)
        .set({ status: "REFUNDED", updatedAt: now })
        .where(
          and(
            eq(escrowHold.id, item.escrowHoldId),
            eq(escrowHold.status, "HELD")
          )
        )
        .returning({ id: escrowHold.id });
      if (!updatedHold) {
        throwConflict("EscrowHold vừa được xử lý bởi một request khác.");
      }
      return updatedHold;
    })(),
  ]);

  await createNotificationEvent(executor, {
    body: `Khoản hoàn tiền ${item.escrowAmount.toLocaleString("vi-VN")} VND đã được ghi có vào ví của bạn.`,
    context: {
      amount: item.escrowAmount,
      orderItemId: item.orderItemId,
      transactionId: refundTransaction.id,
    },
    email: {
      htmlBody: `<p>Khoản hoàn tiền ${item.escrowAmount.toLocaleString("vi-VN")} VND đã được ghi có vào ví của bạn.</p>`,
      recipientUserIds: [item.buyerId],
      subject: "Avin: Hoàn tiền thành công",
      textBody: `Khoản hoàn tiền ${item.escrowAmount.toLocaleString("vi-VN")} VND đã được ghi có vào ví của bạn.`,
    },
    eventType: "transaction.refund_committed",
    recipients: [
      { targetPath: `/orders/${item.orderId}`, userId: item.buyerId },
      ...(await listNotificationRecipientsByRole(executor, {
        role: "ADMIN",
        targetPath: "/disputes",
      })),
    ],
    sourceId: refundTransaction.id,
    sourceType: "LEDGER_TRANSACTION",
    title: "Hoàn tiền thành công",
  });

  return refundTransaction.id;
};

const releaseEscrowHold = async (
  executor: CommerceExecutor,
  item: EscrowResolutionContext,
  now: Date
): Promise<string> => {
  const buyerAccounts = await ensureWalletAccounts(executor, item.buyerId);
  const sellerAccounts = await ensureSellerWalletAccounts(
    executor,
    item.sellerId
  );
  const [buyerWallet] = await executor
    .select()
    .from(userWallet)
    .where(eq(userWallet.id, buyerAccounts.wallet.id))
    .for("update")
    .limit(1);
  if (!buyerWallet || buyerWallet.heldBalance < item.escrowAmount) {
    return throwConflict("Held Balance của Buyer không đủ để giải ngân.");
  }

  const commissionRatePercent = Number(item.commissionRatePercent);
  if (
    !Number.isFinite(commissionRatePercent) ||
    commissionRatePercent < 0 ||
    commissionRatePercent > 100
  ) {
    return throwConflict("Commission rate của OrderItem không hợp lệ.");
  }
  const { commissionAmount, sellerProceeds } = calculateEscrowReleaseAmounts(
    item.escrowAmount,
    commissionRatePercent
  );

  const [releaseTransaction] = await Promise.all([
    recordBalancedLedgerTransaction(executor, {
      amount: item.escrowAmount,
      description: `RELEASE ORDER_ITEM ${item.orderItemId}`,
      postings: [
        {
          accountId: buyerAccounts.heldAccount.id,
          debitAmount: item.escrowAmount,
        },
        ...(sellerProceeds > 0
          ? [
              {
                accountId: sellerAccounts.availableAccount.id,
                creditAmount: sellerProceeds,
              },
            ]
          : []),
        ...(commissionAmount > 0
          ? [
              {
                accountId: sellerAccounts.platformCommissionAccount.id,
                creditAmount: commissionAmount,
              },
            ]
          : []),
      ],
      reference: createTransactionReference("RELEASE", item.orderItemId),
      type: "ESCROW_RELEASE",
    }),
    (async () => {
      const [walletAfterUpdate] = await executor
        .update(userWallet)
        .set({
          heldBalance: buyerWallet.heldBalance - item.escrowAmount,
          updatedAt: now,
        })
        .where(
          and(
            eq(userWallet.id, buyerAccounts.wallet.id),
            gte(userWallet.heldBalance, item.escrowAmount)
          )
        )
        .returning({ heldBalance: userWallet.heldBalance });
      if (!walletAfterUpdate) {
        throwConflict("Held Balance của Buyer vừa thay đổi. Vui lòng thử lại.");
      }
      return walletAfterUpdate;
    })(),
    (async () => {
      const [updatedHold] = await executor
        .update(escrowHold)
        .set({ status: "RELEASED", updatedAt: now })
        .where(
          and(
            eq(escrowHold.id, item.escrowHoldId),
            eq(escrowHold.status, "HELD")
          )
        )
        .returning({ id: escrowHold.id });
      if (!updatedHold) {
        throwConflict("EscrowHold vừa được xử lý bởi một request khác.");
      }
      return updatedHold;
    })(),
  ]);

  return releaseTransaction.id;
};

export const resolveEscrowHold = async ({
  executor,
  item,
  now,
  outcome,
}: {
  executor: CommerceExecutor;
  item: EscrowResolutionContext;
  now: Date;
  outcome: EscrowResolutionOutcome;
}): Promise<string> => {
  if (item.escrowHoldStatus !== "HELD") {
    return throwConflict("EscrowHold không còn ở trạng thái HELD.");
  }

  return outcome === "REFUND"
    ? await refundEscrowHold(executor, item, now)
    : await releaseEscrowHold(executor, item, now);
};
