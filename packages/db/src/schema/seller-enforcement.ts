import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { orderItem } from "./commerce";

export const sellerEnforcementState = pgEnum("seller_enforcement_state", [
  "CLEAR",
  "SUSPENDED",
  "BANNED",
]);

export const sellerEnforcementReasonCode = pgEnum(
  "seller_enforcement_reason_code",
  [
    "FRAUD_RISK",
    "POLICY_VIOLATION",
    "FULFILLMENT_RISK",
    "FINANCIAL_RISK",
    "OTHER",
  ]
);

export const sellerEnforcementActionType = pgEnum(
  "seller_enforcement_action_type",
  [
    "SUSPEND",
    "BAN",
    "LIFT",
    "ESCALATE",
    "OVERTURN",
    "EXPIRE",
    "REASON_CORRECTED",
  ]
);

export const sellerEnforcementRemediationStatus = pgEnum(
  "seller_enforcement_remediation_status",
  ["PENDING", "RUNNING", "COMPLETED", "NEEDS_ATTENTION"]
);

export const sellerEnforcementRemediationItemStatus = pgEnum(
  "seller_enforcement_remediation_item_status",
  ["PENDING", "RUNNING", "COMPLETED", "FAILED"]
);

export const sellerEnforcementAppealStatus = pgEnum(
  "seller_enforcement_appeal_status",
  ["SUBMITTED", "UNDER_REVIEW", "UPHELD", "OVERTURNED", "SUPERSEDED"]
);

export const sellerEnforcement = pgTable("seller_enforcement", {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  sellerId: text("seller_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "restrict" }),
  state: sellerEnforcementState("state").default("CLEAR").notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const sellerEnforcementAction = pgTable(
  "seller_enforcement_action",
  {
    actionType: sellerEnforcementActionType("action_type").notNull(),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "restrict",
    }),
    adminNote: text("admin_note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    effectiveAt: timestamp("effective_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at"),
    id: uuid("id").defaultRandom().primaryKey(),
    idempotencyKey: text("idempotency_key").notNull(),
    newState: sellerEnforcementState("new_state").notNull(),
    previousState: sellerEnforcementState("previous_state").notNull(),
    reasonCode: sellerEnforcementReasonCode("reason_code").notNull(),
    sellerId: text("seller_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    sellerReason: text("seller_reason").notNull(),
    supersedesActionId: uuid("supersedes_action_id"),
  },
  (table) => [
    uniqueIndex("seller_enforcement_action_seller_key_idx").on(
      table.sellerId,
      table.idempotencyKey
    ),
    uniqueIndex("seller_enforcement_action_supersedes_idx").on(
      table.supersedesActionId
    ),
  ]
);

export const sellerEnforcementRemediation = pgTable(
  "seller_enforcement_remediation",
  {
    actionId: uuid("action_id")
      .notNull()
      .unique()
      .references(() => sellerEnforcementAction.id, { onDelete: "restrict" }),
    completedItems: integer("completed_items").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    failedItems: integer("failed_items").default(0).notNull(),
    finishedAt: timestamp("finished_at"),
    id: uuid("id").defaultRandom().primaryKey(),
    lastError: text("last_error"),
    sellerId: text("seller_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    startedAt: timestamp("started_at"),
    status: sellerEnforcementRemediationStatus("status")
      .default("PENDING")
      .notNull(),
    totalItems: integer("total_items").default(0).notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("seller_enforcement_remediation_seller_action_idx").on(
      table.sellerId,
      table.actionId
    ),
  ]
);

export const sellerEnforcementRemediationItem = pgTable(
  "seller_enforcement_remediation_item",
  {
    attempts: integer("attempts").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    lastError: text("last_error"),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItem.id, { onDelete: "restrict" }),
    processedAt: timestamp("processed_at"),
    remediationId: uuid("remediation_id")
      .notNull()
      .references(() => sellerEnforcementRemediation.id, {
        onDelete: "cascade",
      }),
    status: sellerEnforcementRemediationItemStatus("status")
      .default("PENDING")
      .notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("seller_enforcement_remediation_item_unique_idx").on(
      table.remediationId,
      table.orderItemId
    ),
  ]
);

export const sellerEnforcementAppeal = pgTable(
  "seller_enforcement_appeal",
  {
    actionId: uuid("action_id")
      .notNull()
      .unique()
      .references(() => sellerEnforcementAction.id, { onDelete: "restrict" }),
    adminNote: text("admin_note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    idempotencyKey: text("idempotency_key").notNull(),
    outcomeReason: text("outcome_reason"),
    reviewedAt: timestamp("reviewed_at"),
    reviewerUserId: text("reviewer_user_id").references(() => user.id, {
      onDelete: "restrict",
    }),
    sellerId: text("seller_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    sellerReason: text("seller_reason").notNull(),
    status: sellerEnforcementAppealStatus("status")
      .default("SUBMITTED")
      .notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("seller_enforcement_appeal_seller_key_idx").on(
      table.sellerId,
      table.idempotencyKey
    ),
  ]
);

export const sellerEnforcementAppealEvidence = pgTable(
  "seller_enforcement_appeal_evidence",
  {
    appealId: uuid("appeal_id")
      .notNull()
      .references(() => sellerEnforcementAppeal.id, { onDelete: "restrict" }),
    byteSize: integer("byte_size").notNull(),
    contentType: text("content_type").notNull(),
    description: text("description").notNull(),
    fileName: text("file_name").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    storageKey: text("storage_key").notNull(),
    submittedAt: timestamp("submitted_at").defaultNow().notNull(),
    submittedByUserId: text("submitted_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
  },
  (table) => [
    uniqueIndex("seller_enforcement_appeal_evidence_storage_idx").on(
      table.storageKey
    ),
    uniqueIndex("seller_enforcement_appeal_evidence_appeal_storage_idx").on(
      table.appealId,
      table.storageKey
    ),
  ]
);
