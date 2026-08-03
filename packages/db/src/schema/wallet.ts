import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const ledgerAccountType = pgEnum("ledger_account_type", [
  "PLATFORM_BANK_CLEARING",
  "USER_WALLET_AVAILABLE",
  "USER_WALLET_HELD",
  "SELLER_WALLET_PENDING",
  "SELLER_WALLET_AVAILABLE",
  "ESCROW",
  "PLATFORM_COMMISSION",
]);

export const ledgerBalanceSide = pgEnum("ledger_balance_side", [
  "DEBIT",
  "CREDIT",
]);

export const ledgerTransactionType = pgEnum("ledger_transaction_type", [
  "DEPOSIT",
  "PURCHASE_HOLD",
  "ESCROW_RELEASE",
  "PLATFORM_COMMISSION",
  "REFUND",
  "WITHDRAWAL_REQUEST",
  "WITHDRAWAL_PAID",
  "REVERSAL",
]);

export const depositRequestStatus = pgEnum("deposit_request_status", [
  "PENDING",
  "CREDITED",
]);

export const sepayEventSource = pgEnum("sepay_event_source", [
  "WEBHOOK",
  "API",
]);

export const sepayEventStatus = pgEnum("sepay_event_status", [
  "RECEIVED",
  "UNMATCHED",
  "CREDITED",
  "RECONCILED",
]);

export const sepayTransferType = pgEnum("sepay_transfer_type", ["in", "out"]);

export const walletOutboxEventType = pgEnum("wallet_outbox_event_type", [
  "DEPOSIT_CREDITED",
]);

export const userWallet = pgTable(
  "user_wallet",
  {
    availableBalance: integer("available_balance").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    heldBalance: integer("held_balance").default(0).notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("user_wallet_user_id_unique_idx").on(table.userId),
    check(
      "user_wallet_balances_non_negative_check",
      sql`${table.availableBalance} >= 0 AND ${table.heldBalance} >= 0`
    ),
  ]
);

export const ledgerAccount = pgTable(
  "ledger_account",
  {
    accountKey: text("account_key").notNull(),
    accountType: ledgerAccountType("account_type").notNull(),
    balanceAmount: integer("balance_amount").default(0).notNull(),
    balanceSide: ledgerBalanceSide("balance_side").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    userId: text("user_id").references(() => user.id, {
      onDelete: "cascade",
    }),
  },
  (table) => [
    uniqueIndex("ledger_account_key_unique_idx").on(table.accountKey),
    index("ledger_account_user_id_idx").on(table.userId),
    index("ledger_account_type_idx").on(table.accountType),
    check(
      "ledger_account_balance_non_negative_check",
      sql`${table.balanceAmount} >= 0`
    ),
  ]
);

export const ledgerTransaction = pgTable(
  "ledger_transaction",
  {
    amount: integer("amount").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    currency: text("currency").default("VND").notNull(),
    description: text("description"),
    id: uuid("id").defaultRandom().primaryKey(),
    reference: text("reference").notNull(),
    reversalOfId: uuid("reversal_of_id").references(
      (): AnyPgColumn => ledgerTransaction.id,
      { onDelete: "restrict" }
    ),
    type: ledgerTransactionType("type").notNull(),
  },
  (table) => [
    uniqueIndex("ledger_transaction_reference_unique_idx").on(table.reference),
    index("ledger_transaction_created_at_idx").on(table.createdAt),
    index("ledger_transaction_type_idx").on(table.type),
    check("ledger_transaction_amount_positive_check", sql`${table.amount} > 0`),
  ]
);

export const ledgerPosting = pgTable(
  "ledger_posting",
  {
    balanceAfter: integer("balance_after").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    creditAmount: integer("credit_amount").default(0).notNull(),
    debitAmount: integer("debit_amount").default(0).notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    ledgerAccountId: uuid("ledger_account_id")
      .notNull()
      .references(() => ledgerAccount.id, { onDelete: "restrict" }),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => ledgerTransaction.id, { onDelete: "restrict" }),
  },
  (table) => [
    index("ledger_posting_account_id_idx").on(table.ledgerAccountId),
    index("ledger_posting_transaction_id_idx").on(table.transactionId),
    check(
      "ledger_posting_amounts_non_negative_check",
      sql`${table.debitAmount} >= 0 AND ${table.creditAmount} >= 0`
    ),
    check(
      "ledger_posting_one_side_check",
      sql`(${table.debitAmount} > 0 AND ${table.creditAmount} = 0) OR (${table.creditAmount} > 0 AND ${table.debitAmount} = 0)`
    ),
    check(
      "ledger_posting_balance_non_negative_check",
      sql`${table.balanceAfter} >= 0`
    ),
  ]
);

export const depositRequest = pgTable(
  "deposit_request",
  {
    amount: integer("amount").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    creditedAt: timestamp("credited_at"),
    creditedTransactionId: uuid("credited_transaction_id").references(
      () => ledgerTransaction.id,
      { onDelete: "restrict" }
    ),
    id: uuid("id").defaultRandom().primaryKey(),
    paymentCode: text("payment_code").notNull(),
    status: depositRequestStatus("status").default("PENDING").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("deposit_request_payment_code_unique_idx").on(
      table.paymentCode
    ),
    index("deposit_request_user_created_at_idx").on(
      table.userId,
      table.createdAt
    ),
    index("deposit_request_status_idx").on(table.status),
    check("deposit_request_amount_minimum_check", sql`${table.amount} >= 5000`),
  ]
);

export const sepayPaymentEvent = pgTable(
  "sepay_payment_event",
  {
    accountNumber: text("account_number").notNull(),
    amount: integer("amount").notNull(),
    bankReference: text("bank_reference"),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    currency: text("currency").notNull(),
    depositRequestId: uuid("deposit_request_id").references(
      () => depositRequest.id,
      { onDelete: "restrict" }
    ),
    failureReason: text("failure_reason"),
    gateway: text("gateway").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    ledgerTransactionId: uuid("ledger_transaction_id").references(
      () => ledgerTransaction.id,
      { onDelete: "restrict" }
    ),
    paymentCode: text("payment_code"),
    processedAt: timestamp("processed_at"),
    providerEventId: text("provider_event_id").notNull(),
    rawBody: text("raw_body").notNull(),
    rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>().notNull(),
    receivedAt: timestamp("received_at").defaultNow().notNull(),
    reconciledByUserId: text("reconciled_by_user_id").references(
      () => user.id,
      {
        onDelete: "set null",
      }
    ),
    source: sepayEventSource("source").notNull(),
    status: sepayEventStatus("status").default("RECEIVED").notNull(),
    transactionAt: timestamp("transaction_at").notNull(),
    transferType: sepayTransferType("transfer_type").notNull(),
  },
  (table) => [
    uniqueIndex("sepay_payment_event_source_provider_unique_idx").on(
      table.source,
      table.providerEventId
    ),
    uniqueIndex("sepay_payment_event_bank_reference_unique_idx").on(
      table.bankReference
    ),
    index("sepay_payment_event_status_idx").on(table.status),
    index("sepay_payment_event_payment_code_idx").on(table.paymentCode),
    index("sepay_payment_event_transaction_at_idx").on(table.transactionAt),
    check(
      "sepay_payment_event_amount_non_negative_check",
      sql`${table.amount} >= 0`
    ),
  ]
);

export const walletOutboxEvent = pgTable(
  "wallet_outbox_event",
  {
    aggregateId: text("aggregate_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    eventType: walletOutboxEventType("event_type").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    ledgerTransactionId: uuid("ledger_transaction_id")
      .notNull()
      .references(() => ledgerTransaction.id, { onDelete: "restrict" }),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    publishedAt: timestamp("published_at"),
  },
  (table) => [
    uniqueIndex("wallet_outbox_transaction_unique_idx").on(
      table.ledgerTransactionId
    ),
    index("wallet_outbox_unpublished_idx").on(
      table.publishedAt,
      table.createdAt
    ),
  ]
);

export const userWalletRelations = relations(userWallet, ({ one, many }) => ({
  depositRequests: many(depositRequest),
  user: one(user, {
    fields: [userWallet.userId],
    references: [user.id],
  }),
}));

export const ledgerAccountRelations = relations(
  ledgerAccount,
  ({ one, many }) => ({
    postings: many(ledgerPosting),
    user: one(user, {
      fields: [ledgerAccount.userId],
      references: [user.id],
    }),
  })
);

export const ledgerTransactionRelations = relations(
  ledgerTransaction,
  ({ one, many }) => ({
    postings: many(ledgerPosting),
    reversalOf: one(ledgerTransaction, {
      fields: [ledgerTransaction.reversalOfId],
      references: [ledgerTransaction.id],
      relationName: "reversal",
    }),
    reversals: many(ledgerTransaction, { relationName: "reversal" }),
  })
);

export const ledgerPostingRelations = relations(ledgerPosting, ({ one }) => ({
  account: one(ledgerAccount, {
    fields: [ledgerPosting.ledgerAccountId],
    references: [ledgerAccount.id],
  }),
  transaction: one(ledgerTransaction, {
    fields: [ledgerPosting.transactionId],
    references: [ledgerTransaction.id],
  }),
}));

export const depositRequestRelations = relations(
  depositRequest,
  ({ one, many }) => ({
    creditedTransaction: one(ledgerTransaction, {
      fields: [depositRequest.creditedTransactionId],
      references: [ledgerTransaction.id],
    }),
    events: many(sepayPaymentEvent),
    user: one(user, {
      fields: [depositRequest.userId],
      references: [user.id],
    }),
  })
);

export const sepayPaymentEventRelations = relations(
  sepayPaymentEvent,
  ({ one }) => ({
    depositRequest: one(depositRequest, {
      fields: [sepayPaymentEvent.depositRequestId],
      references: [depositRequest.id],
    }),
    ledgerTransaction: one(ledgerTransaction, {
      fields: [sepayPaymentEvent.ledgerTransactionId],
      references: [ledgerTransaction.id],
    }),
    reconciledBy: one(user, {
      fields: [sepayPaymentEvent.reconciledByUserId],
      references: [user.id],
    }),
  })
);

export const walletOutboxEventRelations = relations(
  walletOutboxEvent,
  ({ one }) => ({
    transaction: one(ledgerTransaction, {
      fields: [walletOutboxEvent.ledgerTransactionId],
      references: [ledgerTransaction.id],
    }),
  })
);
