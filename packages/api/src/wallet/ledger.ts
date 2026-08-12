import type { db } from "@avin/db";
import {
  ledgerAccount,
  ledgerPosting,
  ledgerTransaction,
} from "@avin/db/schema/wallet";
import type { ledgerBalanceSide } from "@avin/db/schema/wallet";
import { eq, sql } from "drizzle-orm";

export type WalletExecutor = Pick<typeof db, "insert" | "select" | "update">;

export interface LedgerPostingInput {
  accountId: string;
  creditAmount?: number;
  debitAmount?: number;
}

export interface LedgerTransactionInput {
  amount: number;
  description?: string;
  postings: LedgerPostingInput[];
  reference: string;
  reversalOfId?: string;
  type: typeof ledgerTransaction.$inferInsert.type;
}

export interface RecordedLedgerTransaction {
  id: string;
  postings: {
    accountId: string;
    balanceAfter: number;
    creditAmount: number;
    debitAmount: number;
  }[];
  reference: string;
}

const getPostingAmount = (amount: number | undefined): number => amount ?? 0;

const updateLedgerAccountBalance = async (
  executor: WalletExecutor,
  accountId: string,
  balanceSide: (typeof ledgerBalanceSide.enumValues)[number],
  debitAmount: number,
  creditAmount: number
): Promise<number> => {
  const delta =
    balanceSide === "DEBIT"
      ? debitAmount - creditAmount
      : creditAmount - debitAmount;

  const [updated] = await executor
    .update(ledgerAccount)
    .set({
      balanceAmount: sql`${ledgerAccount.balanceAmount} + ${delta}`,
      updatedAt: new Date(),
    })
    .where(eq(ledgerAccount.id, accountId))
    .returning({
      balanceAmount: ledgerAccount.balanceAmount,
    });

  if (!updated || updated.balanceAmount < 0) {
    throw new Error("Ledger account balance cannot become negative");
  }

  return updated.balanceAmount;
};

const recordLedgerPosting = async (
  executor: WalletExecutor,
  transaction: { id: string },
  posting: { accountId: string; creditAmount: number; debitAmount: number }
): Promise<RecordedLedgerTransaction["postings"][number]> => {
  const [account] = await executor
    .select({
      balanceAmount: ledgerAccount.balanceAmount,
      balanceSide: ledgerAccount.balanceSide,
    })
    .from(ledgerAccount)
    .where(eq(ledgerAccount.id, posting.accountId))
    .limit(1);

  if (!account) {
    throw new Error("Ledger account was not found");
  }

  const balanceAfter = await updateLedgerAccountBalance(
    executor,
    posting.accountId,
    account.balanceSide,
    posting.debitAmount,
    posting.creditAmount
  );

  await executor.insert(ledgerPosting).values({
    balanceAfter,
    creditAmount: posting.creditAmount,
    debitAmount: posting.debitAmount,
    ledgerAccountId: posting.accountId,
    transactionId: transaction.id,
  });

  return {
    accountId: posting.accountId,
    balanceAfter,
    creditAmount: posting.creditAmount,
    debitAmount: posting.debitAmount,
  };
};

export const recordBalancedLedgerTransaction = async (
  executor: WalletExecutor,
  input: LedgerTransactionInput
): Promise<RecordedLedgerTransaction> => {
  const postings = input.postings.map((posting) => ({
    accountId: posting.accountId,
    creditAmount: getPostingAmount(posting.creditAmount),
    debitAmount: getPostingAmount(posting.debitAmount),
  }));
  const totalDebits = postings.reduce(
    (total, posting) => total + posting.debitAmount,
    0
  );
  const totalCredits = postings.reduce(
    (total, posting) => total + posting.creditAmount,
    0
  );

  if (
    input.amount <= 0 ||
    postings.length < 2 ||
    totalDebits !== input.amount ||
    totalCredits !== input.amount ||
    postings.some(
      (posting) =>
        (posting.debitAmount > 0 && posting.creditAmount > 0) ||
        (posting.debitAmount === 0 && posting.creditAmount === 0)
    )
  ) {
    throw new Error("Ledger transaction postings must be balanced");
  }

  const [transaction] = await executor
    .insert(ledgerTransaction)
    .values({
      amount: input.amount,
      description: input.description,
      reference: input.reference,
      reversalOfId: input.reversalOfId,
      type: input.type,
    })
    .returning({
      id: ledgerTransaction.id,
      reference: ledgerTransaction.reference,
    });

  if (!transaction) {
    throw new Error("Ledger transaction was not created");
  }

  const recordedPostings: RecordedLedgerTransaction["postings"] = [];
  for (const posting of postings) {
    recordedPostings.push(
      await recordLedgerPosting(executor, transaction, posting)
    );
  }

  return {
    id: transaction.id,
    postings: recordedPostings,
    reference: transaction.reference,
  };
};
