import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

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
