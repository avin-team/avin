/* eslint-disable no-await-in-loop, react-doctor/async-await-in-loop */

import { db } from "@avin/db";
import { user } from "@avin/db/schema/auth";
import {
  depositRequest,
  ledgerAccount,
  ledgerPosting,
  ledgerTransaction,
  sepayPaymentEvent,
  userWallet,
  walletOutboxEvent,
} from "@avin/db/schema/wallet";
import { ORPCError } from "@orpc/server";
import {
  and,
  count,
  desc,
  eq,
  exists,
  gte,
  inArray,
  lt,
  not,
  or,
  sql,
} from "drizzle-orm";

import {
  createNotificationEvent,
  listNotificationRecipientsByRole,
} from "../notifications/notification";
import { recordBalancedLedgerTransaction } from "./ledger";
import type { WalletExecutor } from "./ledger";
import {
  buildVietQrUrl,
  generatePaymentCode,
  validateDepositAmount,
} from "./sepay";
import type { NormalizedSePayEvent } from "./sepay";

export { DEPOSIT_MINIMUM_AMOUNT } from "./sepay";
export const DEPOSIT_REQUESTS_PER_MINUTE = 5;
export const DEPOSIT_REQUESTS_PER_DAY = 30;
export const DEPOSIT_HISTORY_PAGE_SIZE = 20;

export interface WalletBankConfiguration {
  accountName: string;
  accountNumber: string;
  bank: string;
}

export interface DepositRequestView {
  accountName: string;
  accountNumber: string;
  amount: number;
  bank: string;
  createdAt: string;
  paymentCode: string;
  qrUrl: string;
  requestId: string;
  status: "CREDITED" | "PENDING";
}

export interface DepositStatusView {
  amount: number;
  creditedAmount: number | null;
  newAvailableBalance: number | null;
  paymentCode: string;
  status: "CREDITED" | "PENDING";
  transactionReference: string | null;
}

export interface WalletSummaryView {
  availableBalance: number;
  heldBalance: number;
}

export interface WalletTransactionView {
  amount: number;
  currency: string;
  id: string;
  paymentReference: string;
  resultingAvailableBalance: number | null;
  status: "ATTENTION" | "COMPLETED" | "PENDING" | "REVERSED";
  timestamp: string;
  type: string;
}

export interface WalletTransactionPage {
  items: WalletTransactionView[];
  nextCursor: string | null;
}

export interface DepositCreditResult {
  amount: number;
  newAvailableBalance: number;
  transactionId: string;
  transactionReference: string;
  userId: string;
}

interface WalletHistoryCandidate {
  createdAt: Date;
  cursorId: string;
  item: WalletTransactionView;
}

export const PLATFORM_BANK_CLEARING_ACCOUNT_KEY = "PLATFORM_BANK_CLEARING";
export const PLATFORM_COMMISSION_ACCOUNT_KEY = "PLATFORM_COMMISSION";

const accountKeyForUser = (type: "AVAILABLE" | "HELD", userId: string) =>
  `USER_WALLET_${type}:${userId}`;

export const accountKeyForSeller = (
  type: "AVAILABLE" | "HELD" | "PENDING",
  sellerId: string
) => `SELLER_WALLET_${type}:${sellerId}`;

const requireBankConfiguration = (
  configuration: WalletBankConfiguration
): WalletBankConfiguration => {
  if (
    !configuration.accountName.trim() ||
    !configuration.accountNumber.trim() ||
    !configuration.bank.trim()
  ) {
    throw new ORPCError("SERVICE_UNAVAILABLE", {
      message: "Nạp tiền chưa được cấu hình tài khoản nhận.",
    });
  }

  return configuration;
};

export const ensureWalletAccounts = async (
  executor: WalletExecutor,
  userId: string
): Promise<{
  availableAccount: typeof ledgerAccount.$inferSelect;
  heldAccount: typeof ledgerAccount.$inferSelect;
  platformAccount: typeof ledgerAccount.$inferSelect;
  platformCommissionAccount: typeof ledgerAccount.$inferSelect;
  wallet: typeof userWallet.$inferSelect;
}> => {
  await executor
    .insert(userWallet)
    .values({ userId })
    .onConflictDoNothing({ target: userWallet.userId });

  const [wallet] = await executor
    .select()
    .from(userWallet)
    .where(eq(userWallet.userId, userId))
    .limit(1);

  if (!wallet) {
    throw new Error("User wallet was not created");
  }

  const accountValues = [
    {
      accountKey: accountKeyForUser("AVAILABLE", userId),
      accountType: "USER_WALLET_AVAILABLE" as const,
      balanceSide: "CREDIT" as const,
      userId,
    },
    {
      accountKey: accountKeyForUser("HELD", userId),
      accountType: "USER_WALLET_HELD" as const,
      balanceSide: "CREDIT" as const,
      userId,
    },
    {
      accountKey: PLATFORM_BANK_CLEARING_ACCOUNT_KEY,
      accountType: "PLATFORM_BANK_CLEARING" as const,
      balanceSide: "DEBIT" as const,
      userId: null,
    },
    {
      accountKey: PLATFORM_COMMISSION_ACCOUNT_KEY,
      accountType: "PLATFORM_COMMISSION" as const,
      balanceSide: "CREDIT" as const,
      userId: null,
    },
  ];

  await Promise.all(
    accountValues.map((account) =>
      executor
        .insert(ledgerAccount)
        .values(account)
        .onConflictDoNothing({ target: ledgerAccount.accountKey })
    )
  );

  const accounts = await executor
    .select()
    .from(ledgerAccount)
    .where(
      or(
        eq(ledgerAccount.accountKey, accountKeyForUser("AVAILABLE", userId)),
        eq(ledgerAccount.accountKey, accountKeyForUser("HELD", userId)),
        eq(ledgerAccount.accountKey, PLATFORM_BANK_CLEARING_ACCOUNT_KEY),
        eq(ledgerAccount.accountKey, PLATFORM_COMMISSION_ACCOUNT_KEY)
      )
    );
  const availableAccount = accounts.find(
    (account) => account.accountKey === accountKeyForUser("AVAILABLE", userId)
  );
  const heldAccount = accounts.find(
    (account) => account.accountKey === accountKeyForUser("HELD", userId)
  );
  const platformAccount = accounts.find(
    (account) => account.accountKey === PLATFORM_BANK_CLEARING_ACCOUNT_KEY
  );
  const platformCommissionAccount = accounts.find(
    (account) => account.accountKey === PLATFORM_COMMISSION_ACCOUNT_KEY
  );

  if (
    !availableAccount ||
    !heldAccount ||
    !platformAccount ||
    !platformCommissionAccount
  ) {
    throw new Error("Wallet ledger accounts were not created");
  }

  return {
    availableAccount,
    heldAccount,
    platformAccount,
    platformCommissionAccount,
    wallet,
  };
};

export const ensureSellerWalletAccounts = async (
  executor: WalletExecutor,
  sellerId: string
): Promise<{
  availableAccount: typeof ledgerAccount.$inferSelect;
  heldAccount: typeof ledgerAccount.$inferSelect;
  pendingAccount: typeof ledgerAccount.$inferSelect;
  platformAccount: typeof ledgerAccount.$inferSelect;
  platformCommissionAccount: typeof ledgerAccount.$inferSelect;
}> => {
  const accountValues = [
    {
      accountKey: accountKeyForSeller("PENDING", sellerId),
      accountType: "SELLER_WALLET_PENDING" as const,
      balanceSide: "CREDIT" as const,
      userId: sellerId,
    },
    {
      accountKey: accountKeyForSeller("AVAILABLE", sellerId),
      accountType: "SELLER_WALLET_AVAILABLE" as const,
      balanceSide: "CREDIT" as const,
      userId: sellerId,
    },
    {
      accountKey: accountKeyForSeller("HELD", sellerId),
      accountType: "SELLER_WALLET_HELD" as const,
      balanceSide: "CREDIT" as const,
      userId: sellerId,
    },
    {
      accountKey: PLATFORM_BANK_CLEARING_ACCOUNT_KEY,
      accountType: "PLATFORM_BANK_CLEARING" as const,
      balanceSide: "DEBIT" as const,
      userId: null,
    },
    {
      accountKey: PLATFORM_COMMISSION_ACCOUNT_KEY,
      accountType: "PLATFORM_COMMISSION" as const,
      balanceSide: "CREDIT" as const,
      userId: null,
    },
  ];

  await Promise.all(
    accountValues.map((account) =>
      executor
        .insert(ledgerAccount)
        .values(account)
        .onConflictDoNothing({ target: ledgerAccount.accountKey })
    )
  );

  const accounts = await executor
    .select()
    .from(ledgerAccount)
    .where(
      or(
        eq(ledgerAccount.accountKey, accountKeyForSeller("PENDING", sellerId)),
        eq(
          ledgerAccount.accountKey,
          accountKeyForSeller("AVAILABLE", sellerId)
        ),
        eq(ledgerAccount.accountKey, accountKeyForSeller("HELD", sellerId)),
        eq(ledgerAccount.accountKey, PLATFORM_BANK_CLEARING_ACCOUNT_KEY),
        eq(ledgerAccount.accountKey, PLATFORM_COMMISSION_ACCOUNT_KEY)
      )
    );
  const pendingAccount = accounts.find(
    (account) => account.accountKey === accountKeyForSeller("PENDING", sellerId)
  );
  const availableAccount = accounts.find(
    (account) =>
      account.accountKey === accountKeyForSeller("AVAILABLE", sellerId)
  );
  const heldAccount = accounts.find(
    (account) => account.accountKey === accountKeyForSeller("HELD", sellerId)
  );
  const platformAccount = accounts.find(
    (account) => account.accountKey === PLATFORM_BANK_CLEARING_ACCOUNT_KEY
  );
  const platformCommissionAccount = accounts.find(
    (account) => account.accountKey === PLATFORM_COMMISSION_ACCOUNT_KEY
  );

  if (
    !availableAccount ||
    !heldAccount ||
    !pendingAccount ||
    !platformAccount ||
    !platformCommissionAccount
  ) {
    throw new Error("Seller wallet ledger accounts were not created");
  }

  return {
    availableAccount,
    heldAccount,
    pendingAccount,
    platformAccount,
    platformCommissionAccount,
  };
};

const countRequestsSince = async (
  executor: WalletExecutor,
  userId: string,
  since: Date
): Promise<number> => {
  const [result] = await executor
    .select({ count: count() })
    .from(depositRequest)
    .where(
      and(
        eq(depositRequest.userId, userId),
        gte(depositRequest.createdAt, since)
      )
    );

  return result?.count ?? 0;
};

const createTransactionReference = (): string =>
  `AVTX-${crypto.randomUUID().replaceAll("-", "").slice(0, 24).toUpperCase()}`;

const insertDepositRequest = async (
  executor: WalletExecutor,
  values: typeof depositRequest.$inferInsert,
  attemptsRemaining: number
): Promise<typeof depositRequest.$inferSelect | undefined> => {
  const [request] = await executor
    .insert(depositRequest)
    .values(values)
    .onConflictDoNothing({ target: depositRequest.paymentCode })
    .returning();

  if (request || attemptsRemaining <= 1) {
    return request;
  }

  return insertDepositRequest(
    executor,
    { ...values, paymentCode: generatePaymentCode() },
    attemptsRemaining - 1
  );
};

export const createDepositRequest = ({
  amount,
  bankConfiguration,
  database = db,
  now = new Date(),
  userId,
}: {
  amount: number;
  bankConfiguration: WalletBankConfiguration;
  database?: typeof db;
  now?: Date;
  userId: string;
}): Promise<DepositRequestView> => {
  const configuration = requireBankConfiguration(bankConfiguration);
  validateDepositAmount(amount);
  return database.transaction(async (transaction) => {
    const [account] = await transaction
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, userId))
      .for("update")
      .limit(1);

    if (!account) {
      throw new ORPCError("NOT_FOUND", {
        message: "Tài khoản người dùng không tồn tại.",
      });
    }

    const [minuteCount, dayCount] = await Promise.all([
      countRequestsSince(transaction, userId, new Date(now.getTime() - 60_000)),
      countRequestsSince(
        transaction,
        userId,
        new Date(now.getTime() - 24 * 60 * 60_000)
      ),
    ]);

    if (minuteCount >= DEPOSIT_REQUESTS_PER_MINUTE) {
      throw new ORPCError("TOO_MANY_REQUESTS", {
        message: "Bạn đã tạo quá nhiều yêu cầu nạp tiền trong một phút.",
      });
    }
    if (dayCount >= DEPOSIT_REQUESTS_PER_DAY) {
      throw new ORPCError("TOO_MANY_REQUESTS", {
        message: "Bạn đã đạt giới hạn yêu cầu nạp tiền trong ngày.",
      });
    }

    await ensureWalletAccounts(transaction, userId);

    const request = await insertDepositRequest(
      transaction,
      {
        amount,
        createdAt: now,
        paymentCode: generatePaymentCode(),
        status: "PENDING",
        userId,
      },
      5
    );

    if (request) {
      return {
        accountName: configuration.accountName,
        accountNumber: configuration.accountNumber,
        amount: request.amount,
        bank: configuration.bank,
        createdAt: request.createdAt.toISOString(),
        paymentCode: request.paymentCode,
        qrUrl: buildVietQrUrl({
          accountName: configuration.accountName,
          accountNumber: configuration.accountNumber,
          amount: request.amount,
          bank: configuration.bank,
          paymentCode: request.paymentCode,
        }),
        requestId: request.id,
        status: request.status,
      };
    }

    throw new ORPCError("CONFLICT", {
      message: "Không thể tạo mã nạp tiền. Vui lòng thử lại.",
    });
  });
};

export const getWalletSummary = async (
  executor: WalletExecutor,
  userId: string
): Promise<WalletSummaryView> => {
  const [wallet] = await executor
    .select({
      availableBalance: userWallet.availableBalance,
      heldBalance: userWallet.heldBalance,
    })
    .from(userWallet)
    .where(eq(userWallet.userId, userId))
    .limit(1);

  return {
    availableBalance: wallet?.availableBalance ?? 0,
    heldBalance: wallet?.heldBalance ?? 0,
  };
};

export const getDepositStatus = async (
  executor: WalletExecutor,
  userId: string,
  requestId: string
): Promise<DepositStatusView> => {
  const [request] = await executor
    .select({
      amount: depositRequest.amount,
      creditedAt: depositRequest.creditedAt,
      paymentCode: depositRequest.paymentCode,
      status: depositRequest.status,
      transactionId: depositRequest.creditedTransactionId,
    })
    .from(depositRequest)
    .where(
      and(eq(depositRequest.id, requestId), eq(depositRequest.userId, userId))
    )
    .limit(1);

  if (!request) {
    throw new ORPCError("NOT_FOUND", {
      message: "Yêu cầu nạp tiền không tồn tại.",
    });
  }

  if (!request.transactionId) {
    return {
      amount: request.amount,
      creditedAmount: null,
      newAvailableBalance: null,
      paymentCode: request.paymentCode,
      status: request.status,
      transactionReference: null,
    };
  }

  const [[transaction], summary] = await Promise.all([
    executor
      .select({
        amount: ledgerTransaction.amount,
        reference: ledgerTransaction.reference,
      })
      .from(ledgerTransaction)
      .where(eq(ledgerTransaction.id, request.transactionId))
      .limit(1),
    getWalletSummary(executor, userId),
  ]);

  return {
    amount: request.amount,
    creditedAmount: transaction?.amount ?? null,
    newAvailableBalance: summary.availableBalance,
    paymentCode: request.paymentCode,
    status: request.status,
    transactionReference: transaction?.reference ?? null,
  };
};

const encodeCursor = (createdAt: Date, id: string): string =>
  Buffer.from(
    JSON.stringify({ createdAt: createdAt.toISOString(), id })
  ).toString("base64url");

const decodeCursor = (
  cursor: string
): { createdAt: Date; id: string } | null => {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf-8")
    ) as { createdAt?: unknown; id?: unknown };
    if (typeof parsed.createdAt !== "string" || typeof parsed.id !== "string") {
      return null;
    }
    const createdAt = new Date(parsed.createdAt);
    return Number.isNaN(createdAt.getTime())
      ? null
      : { createdAt, id: parsed.id };
  } catch {
    return null;
  }
};

const transactionTypeLabels: Record<string, string> = {
  DEPOSIT: "Nạp tiền",
  ESCROW_RELEASE: "Giải ngân ký quỹ",
  PLATFORM_COMMISSION: "Phí nền tảng",
  PURCHASE_HOLD: "Thanh toán đơn hàng",
  REFUND: "Hoàn tiền",
  REVERSAL: "Đảo giao dịch",
  SELLER_WALLET_MIGRATION: "Điều chỉnh SellerWallet",
  WITHDRAWAL_PAID: "Chi trả rút tiền",
  WITHDRAWAL_REQUEST: "Yêu cầu rút tiền",
};

export const getWalletTransactions = async (
  executor: WalletExecutor,
  userId: string,
  cursor?: string
): Promise<WalletTransactionPage> => {
  const decodedCursor = cursor ? decodeCursor(cursor) : null;
  if (cursor && !decodedCursor) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Con trỏ lịch sử ví không hợp lệ.",
    });
  }

  const transactionCursorCondition = decodedCursor
    ? or(
        lt(ledgerTransaction.createdAt, decodedCursor.createdAt),
        and(
          eq(ledgerTransaction.createdAt, decodedCursor.createdAt),
          lt(ledgerTransaction.id, decodedCursor.id)
        )
      )
    : undefined;
  const depositEventCursorCondition = decodedCursor
    ? or(
        lt(sepayPaymentEvent.transactionAt, decodedCursor.createdAt),
        and(
          eq(sepayPaymentEvent.transactionAt, decodedCursor.createdAt),
          lt(sepayPaymentEvent.id, decodedCursor.id)
        )
      )
    : undefined;

  const observedDepositStatuses = ["RECEIVED", "UNMATCHED"] as const;
  const observedDepositQuery = executor
    .select({
      amount: sepayPaymentEvent.amount,
      createdAt: sepayPaymentEvent.transactionAt,
      currency: sepayPaymentEvent.currency,
      eventId: sepayPaymentEvent.id,
      eventPaymentCode: sepayPaymentEvent.paymentCode,
      eventStatus: sepayPaymentEvent.status,
      id: depositRequest.id,
      requestPaymentCode: depositRequest.paymentCode,
      transferType: sepayPaymentEvent.transferType,
    })
    .from(sepayPaymentEvent)
    .innerJoin(
      depositRequest,
      eq(sepayPaymentEvent.depositRequestId, depositRequest.id)
    )
    .where(
      and(
        inArray(sepayPaymentEvent.status, observedDepositStatuses),
        inArray(depositRequest.status, ["PENDING", "CREDITED"]),
        eq(depositRequest.userId, userId),
        depositEventCursorCondition
      )
    )
    .orderBy(desc(sepayPaymentEvent.transactionAt), desc(sepayPaymentEvent.id))
    .limit(DEPOSIT_HISTORY_PAGE_SIZE + 1);

  const hasAvailablePosting = exists(
    executor
      .select({ id: ledgerPosting.id })
      .from(ledgerPosting)
      .innerJoin(
        ledgerAccount,
        eq(ledgerPosting.ledgerAccountId, ledgerAccount.id)
      )
      .where(
        and(
          eq(ledgerPosting.transactionId, ledgerTransaction.id),
          eq(ledgerAccount.userId, userId),
          eq(ledgerAccount.accountType, "USER_WALLET_AVAILABLE")
        )
      )
  );

  const [transactionRows, pendingDepositRows, heldOnlyRows] = await Promise.all(
    [
      executor
        .select({
          amount: ledgerTransaction.amount,
          balanceAfter: ledgerPosting.balanceAfter,
          createdAt: ledgerTransaction.createdAt,
          creditAmount: ledgerPosting.creditAmount,
          currency: ledgerTransaction.currency,
          debitAmount: ledgerPosting.debitAmount,
          depositPaymentCode: depositRequest.paymentCode,
          depositRequestId: depositRequest.id,
          id: ledgerTransaction.id,
          reference: ledgerTransaction.reference,
          type: ledgerTransaction.type,
        })
        .from(ledgerPosting)
        .innerJoin(
          ledgerTransaction,
          eq(ledgerPosting.transactionId, ledgerTransaction.id)
        )
        .innerJoin(
          ledgerAccount,
          eq(ledgerPosting.ledgerAccountId, ledgerAccount.id)
        )
        .leftJoin(
          depositRequest,
          and(
            eq(depositRequest.creditedTransactionId, ledgerTransaction.id),
            eq(depositRequest.userId, userId)
          )
        )
        .where(
          and(
            eq(ledgerAccount.userId, userId),
            eq(ledgerAccount.accountType, "USER_WALLET_AVAILABLE"),
            transactionCursorCondition
          )
        )
        .orderBy(desc(ledgerTransaction.createdAt), desc(ledgerTransaction.id))
        .limit(DEPOSIT_HISTORY_PAGE_SIZE + 1),
      observedDepositQuery,
      executor
        .select({
          amount: ledgerTransaction.amount,
          balanceAfter: sql<number | null>`NULL`,
          createdAt: ledgerTransaction.createdAt,
          creditAmount: ledgerPosting.creditAmount,
          currency: ledgerTransaction.currency,
          debitAmount: ledgerPosting.debitAmount,
          depositPaymentCode: sql<string | null>`NULL`,
          depositRequestId: sql<string | null>`NULL`,
          id: ledgerTransaction.id,
          reference: ledgerTransaction.reference,
          type: ledgerTransaction.type,
        })
        .from(ledgerAccount)
        .innerJoin(
          ledgerPosting,
          eq(ledgerPosting.ledgerAccountId, ledgerAccount.id)
        )
        .innerJoin(
          ledgerTransaction,
          eq(ledgerPosting.transactionId, ledgerTransaction.id)
        )
        .where(
          and(
            eq(ledgerAccount.userId, userId),
            eq(ledgerAccount.accountType, "USER_WALLET_HELD"),
            transactionCursorCondition,
            not(hasAvailablePosting)
          )
        )
        .orderBy(desc(ledgerTransaction.createdAt), desc(ledgerTransaction.id))
        .limit(DEPOSIT_HISTORY_PAGE_SIZE + 1),
    ]
  );

  const transactionCandidates: WalletHistoryCandidate[] = [
    ...transactionRows,
    ...heldOnlyRows,
  ].map((row) => {
    const isDeposit = row.depositRequestId !== null;
    const transactionId = isDeposit
      ? `deposit:${row.depositRequestId}`
      : `transaction:${row.id}`;

    return {
      createdAt: row.createdAt,
      cursorId: row.id,
      item: {
        amount: row.creditAmount > 0 ? row.amount : -row.amount,
        currency: row.currency,
        id: transactionId,
        paymentReference: row.depositPaymentCode ?? row.reference,
        resultingAvailableBalance: row.balanceAfter,
        status: row.type === "REVERSAL" ? "REVERSED" : "COMPLETED",
        timestamp: row.createdAt.toISOString(),
        type: transactionTypeLabels[row.type] ?? row.type,
      },
    };
  });
  const pendingDepositCandidates: WalletHistoryCandidate[] =
    pendingDepositRows.map((row) => ({
      createdAt: row.createdAt,
      cursorId: row.eventId,
      item: {
        amount: row.transferType === "out" ? -row.amount : row.amount,
        currency: row.currency,
        id: `deposit-event:${row.eventId}`,
        paymentReference: row.eventPaymentCode ?? row.requestPaymentCode,
        resultingAvailableBalance: null,
        status: row.eventStatus === "UNMATCHED" ? "ATTENTION" : "PENDING",
        timestamp: row.createdAt.toISOString(),
        type: "Nạp tiền",
      },
    }));

  const candidatesById = new Map<string, WalletHistoryCandidate>();
  for (const candidate of [
    ...pendingDepositCandidates,
    ...transactionCandidates,
  ]) {
    candidatesById.set(candidate.item.id, candidate);
  }

  const sortedCandidates = [...candidatesById.values()].toSorted(
    (left, right) => {
      const timestampDifference =
        right.createdAt.getTime() - left.createdAt.getTime();
      return timestampDifference === 0
        ? right.cursorId.localeCompare(left.cursorId)
        : timestampDifference;
    }
  );
  const pageRows = sortedCandidates.slice(0, DEPOSIT_HISTORY_PAGE_SIZE);
  const hasNextPage =
    transactionRows.length > DEPOSIT_HISTORY_PAGE_SIZE ||
    heldOnlyRows.length > DEPOSIT_HISTORY_PAGE_SIZE ||
    pendingDepositRows.length > DEPOSIT_HISTORY_PAGE_SIZE ||
    sortedCandidates.length > DEPOSIT_HISTORY_PAGE_SIZE;
  const lastRow = pageRows.at(-1);

  return {
    items: pageRows.map((row) => row.item),
    nextCursor:
      hasNextPage && lastRow
        ? encodeCursor(lastRow.createdAt, lastRow.cursorId)
        : null,
  };
};

export const creditDepositForEvent = async (
  executor: WalletExecutor,
  event: NormalizedSePayEvent,
  requestId: string
): Promise<DepositCreditResult> => {
  const [request] = await executor
    .select()
    .from(depositRequest)
    .where(eq(depositRequest.id, requestId))
    .for("update")
    .limit(1);

  if (!request) {
    throw new Error("Deposit request was not found");
  }
  if (request.status !== "PENDING" || request.creditedTransactionId) {
    throw new ORPCError("CONFLICT", {
      message: "Yêu cầu nạp tiền đã được ghi có trước đó.",
    });
  }

  const accounts = await ensureWalletAccounts(executor, request.userId);
  const [wallet] = await executor
    .select()
    .from(userWallet)
    .where(eq(userWallet.id, accounts.wallet.id))
    .for("update")
    .limit(1);
  if (!wallet) {
    throw new Error("User wallet was not found");
  }

  const transactionReference = createTransactionReference();
  const transaction = await recordBalancedLedgerTransaction(executor, {
    amount: event.amount,
    description: `SePay deposit ${event.paymentCode ?? event.providerEventId}`,
    postings: [
      {
        accountId: accounts.platformAccount.id,
        debitAmount: event.amount,
      },
      {
        accountId: accounts.availableAccount.id,
        creditAmount: event.amount,
      },
    ],
    reference: transactionReference,
    type: "DEPOSIT",
  });
  // The ledger transaction must be recorded before the materialized wallet balance.
  // eslint-disable-next-line react-doctor/server-sequential-independent-await
  const [updatedWallet] = await executor
    .update(userWallet)
    .set({
      availableBalance: sql`${userWallet.availableBalance} + ${event.amount}`,
      updatedAt: new Date(),
    })
    .where(eq(userWallet.id, wallet.id))
    .returning({ availableBalance: userWallet.availableBalance });

  if (!updatedWallet) {
    throw new Error("User wallet balance was not updated");
  }
  const availablePosting = transaction.postings.find(
    (posting) => posting.accountId === accounts.availableAccount.id
  );
  if (availablePosting?.balanceAfter !== updatedWallet.availableBalance) {
    throw new Error("Ledger and wallet balances are out of sync");
  }

  await executor.insert(walletOutboxEvent).values({
    aggregateId: request.userId,
    eventType: "DEPOSIT_CREDITED",
    ledgerTransactionId: transaction.id,
    payload: {
      amount: event.amount,
      depositRequestId: request.id,
      paymentCode: event.paymentCode,
      transactionReference,
      userId: request.userId,
    },
  });

  await executor
    .update(depositRequest)
    .set({
      creditedAt: new Date(),
      creditedTransactionId: transaction.id,
      status: "CREDITED",
    })
    .where(eq(depositRequest.id, request.id));

  await createNotificationEvent(executor, {
    body: `Ví của bạn đã được ghi có ${event.amount.toLocaleString("vi-VN")} VND.`,
    context: {
      amount: event.amount,
      depositRequestId: request.id,
      transactionId: transaction.id,
    },
    email: {
      htmlBody: `<p>Ví của bạn đã được ghi có ${event.amount.toLocaleString("vi-VN")} VND.</p>`,
      recipientUserIds: [request.userId],
      subject: "Avin: Nạp tiền thành công",
      textBody: `Ví của bạn đã được ghi có ${event.amount.toLocaleString("vi-VN")} VND.`,
    },
    eventType: "transaction.deposit_credited",
    recipients: [
      { targetPath: "/wallet", userId: request.userId },
      ...(await listNotificationRecipientsByRole(executor, {
        role: "ADMIN",
        targetPath: "/operations",
      })),
    ],
    sourceId: transaction.id,
    sourceType: "LEDGER_TRANSACTION",
    title: "Nạp tiền thành công",
  });

  return {
    amount: event.amount,
    newAvailableBalance: updatedWallet.availableBalance,
    transactionId: transaction.id,
    transactionReference: transaction.reference,
    userId: request.userId,
  };
};

export const reverseLedgerTransactionInTransaction = async (
  transaction: WalletExecutor,
  {
    reason,
    transactionId,
  }: {
    reason: string;
    transactionId: string;
  }
): Promise<{
  affectedUserIds: string[];
  reversalId: string;
  reversalReference: string;
}> => {
  const [original] = await transaction
    .select()
    .from(ledgerTransaction)
    .where(eq(ledgerTransaction.id, transactionId))
    .for("update")
    .limit(1);

  if (!original) {
    throw new ORPCError("NOT_FOUND", {
      message: "Giao dịch cần đảo không tồn tại.",
    });
  }
  if (original.type === "REVERSAL") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Không thể đảo một giao dịch đảo.",
    });
  }

  const [existingReversal] = await transaction
    .select({ id: ledgerTransaction.id })
    .from(ledgerTransaction)
    .where(eq(ledgerTransaction.reversalOfId, transactionId))
    .limit(1);
  if (existingReversal) {
    throw new ORPCError("CONFLICT", {
      message: "Giao dịch này đã được đảo trước đó.",
    });
  }

  const originalPostings = await transaction
    .select({
      accountId: ledgerPosting.ledgerAccountId,
      accountType: ledgerAccount.accountType,
      creditAmount: ledgerPosting.creditAmount,
      debitAmount: ledgerPosting.debitAmount,
      userId: ledgerAccount.userId,
    })
    .from(ledgerPosting)
    .innerJoin(
      ledgerAccount,
      eq(ledgerPosting.ledgerAccountId, ledgerAccount.id)
    )
    .where(eq(ledgerPosting.transactionId, transactionId));

  if (originalPostings.length < 2) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Giao dịch không có đủ bút toán để đảo.",
    });
  }

  const walletDeltas = new Map<string, { available: number; held: number }>();
  for (const posting of originalPostings) {
    if (
      !posting.userId ||
      (posting.accountType !== "USER_WALLET_AVAILABLE" &&
        posting.accountType !== "USER_WALLET_HELD")
    ) {
      continue;
    }
    const delta = posting.debitAmount - posting.creditAmount;
    const current = walletDeltas.get(posting.userId) ?? {
      available: 0,
      held: 0,
    };
    if (posting.accountType === "USER_WALLET_AVAILABLE") {
      current.available += delta;
    } else {
      current.held += delta;
    }
    walletDeltas.set(posting.userId, current);
  }

  const walletEntries = [...walletDeltas.entries()].toSorted(
    ([left], [right]) => left.localeCompare(right)
  );

  for (const [userId, delta] of walletEntries) {
    const [wallet] = await transaction
      .select()
      .from(userWallet)
      .where(eq(userWallet.userId, userId))
      .for("update")
      .limit(1);
    if (
      !wallet ||
      wallet.availableBalance + delta.available < 0 ||
      wallet.heldBalance + delta.held < 0
    ) {
      throw new ORPCError("CONFLICT", {
        message:
          "Không thể tự động đảo giao dịch vì số dư ví hiện tại không đủ. Cần xử lý vận hành riêng.",
      });
    }
  }

  const reversal = await recordBalancedLedgerTransaction(transaction, {
    amount: original.amount,
    description: `REVERSAL ${original.reference}: ${reason.trim()}`,
    postings: originalPostings.map((posting) => ({
      accountId: posting.accountId,
      creditAmount: posting.debitAmount,
      debitAmount: posting.creditAmount,
    })),
    reference: createTransactionReference(),
    reversalOfId: original.id,
    type: "REVERSAL",
  });

  for (const [userId, delta] of walletEntries) {
    await transaction
      .update(userWallet)
      .set({
        availableBalance: sql`${userWallet.availableBalance} + ${delta.available}`,
        heldBalance: sql`${userWallet.heldBalance} + ${delta.held}`,
        updatedAt: new Date(),
      })
      .where(eq(userWallet.userId, userId));
  }

  return {
    affectedUserIds: walletEntries.map(([userId]) => userId),
    reversalId: reversal.id,
    reversalReference: reversal.reference,
  };
};

export const reverseLedgerTransaction = ({
  database = db,
  reason,
  transactionId,
}: {
  database?: typeof db;
  reason: string;
  transactionId: string;
}): Promise<{
  affectedUserIds: string[];
  reversalId: string;
  reversalReference: string;
}> =>
  database.transaction(async (transaction) => {
    const result = await reverseLedgerTransactionInTransaction(transaction, {
      reason,
      transactionId,
    });

    await createNotificationEvent(transaction, {
      body: "Một giao dịch tài chính liên quan đến ví của bạn đã được đảo.",
      context: {
        originalTransactionId: transactionId,
        reversalTransactionId: result.reversalId,
      },
      email: {
        htmlBody:
          "<p>Một giao dịch tài chính liên quan đến ví của bạn đã được đảo.</p>",
        recipientUserIds: result.affectedUserIds,
        subject: "Avin: Giao dịch tài chính đã được đảo",
        textBody:
          "Một giao dịch tài chính liên quan đến ví của bạn đã được đảo.",
      },
      eventType: "transaction.reversal_committed",
      recipients: [
        ...result.affectedUserIds.map((userId) => ({
          targetPath: "/wallet",
          userId,
        })),
        ...(await listNotificationRecipientsByRole(transaction, {
          role: "ADMIN",
          targetPath: "/operations",
        })),
      ],
      sourceId: result.reversalId,
      sourceType: "LEDGER_TRANSACTION",
      title: "Giao dịch tài chính đã được đảo",
    });

    return result;
  });
