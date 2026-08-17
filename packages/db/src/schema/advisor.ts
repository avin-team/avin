import { relations, sql } from "drizzle-orm";
import {
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

import { subCategory } from "./catalog";

export const advisorProviderState = pgEnum("advisor_provider_state", [
  "ACTIVE",
  "DISABLED",
  "INVALID",
  "UNAVAILABLE",
]);

export const advisorProviderConfig = pgTable(
  "advisor_provider_config",
  {
    contractVerifiedAt: timestamp("contract_verified_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    disabledAt: timestamp("disabled_at"),
    encryptedApiKey: text("encrypted_api_key").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    keyFingerprint: text("key_fingerprint").notNull(),
    keyLastFour: text("key_last_four").notNull(),
    lastCheckedAt: timestamp("last_checked_at"),
    lastErrorCode: text("last_error_code"),
    lastErrorMessage: text("last_error_message"),
    model: text("model").notNull(),
    provider: text("provider").default("groq").notNull(),
    state: advisorProviderState("state").default("DISABLED").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    zdrVerifiedAt: timestamp("zdr_verified_at"),
  },
  (table) => [
    uniqueIndex("advisor_provider_config_provider_unique_idx").on(
      table.provider
    ),
    index("advisor_provider_config_state_idx").on(table.state),
  ]
);

export const advisorPlaybookStatus = pgEnum("advisor_playbook_status", [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
]);

export const advisorPlaybook = pgTable(
  "advisor_playbook",
  {
    archivedAt: timestamp("archived_at"),
    content: jsonb("content").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    lastTestedAt: timestamp("last_tested_at"),
    publishedAt: timestamp("published_at"),
    scenarioResults: jsonb("scenario_results")
      .$type<unknown[]>()
      .default([])
      .notNull(),
    status: advisorPlaybookStatus("status").default("DRAFT").notNull(),
    subCategoryId: uuid("sub_category_id")
      .notNull()
      .references(() => subCategory.id, { onDelete: "restrict" }),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    version: integer("version").notNull(),
  },
  (table) => [
    uniqueIndex("advisor_playbook_sub_category_version_unique_idx").on(
      table.subCategoryId,
      table.version
    ),
    uniqueIndex("advisor_playbook_published_sub_category_unique_idx")
      .on(table.subCategoryId)
      .where(sql`${table.status} = 'PUBLISHED'`),
    index("advisor_playbook_sub_category_status_idx").on(
      table.subCategoryId,
      table.status
    ),
  ]
);

export const advisorPlaybookRelations = relations(
  advisorPlaybook,
  ({ one }) => ({
    subCategory: one(subCategory, {
      fields: [advisorPlaybook.subCategoryId],
      references: [subCategory.id],
    }),
  })
);
