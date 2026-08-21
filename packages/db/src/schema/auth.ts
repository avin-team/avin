import { relations } from "drizzle-orm";
import {
  boolean,
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

export const accountRole = pgEnum("account_role", [
  "BUYER",
  "SELLER",
  "ADMIN",
  "PROVIDER",
]);

export const auditOutcome = pgEnum("audit_outcome", ["SUCCESS", "FAILURE"]);

export const protectionAdminCapability = pgEnum("protection_admin_capability", [
  "PROVIDER_REVIEWER",
  "RISK_MODERATOR",
  "BOND_OPERATOR",
  "PROTECTION_MANAGER",
  "PROTECTION_EXPORTER",
  "SUPER_ADMIN",
]);

export const user = pgTable("user", {
  banExpires: timestamp("ban_expires"),
  banReason: text("ban_reason"),
  banned: boolean("banned").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  hasSeenSellerOnboarding: boolean("has_seen_seller_onboarding")
    .default(false)
    .notNull(),
  id: text("id").primaryKey(),
  image: text("image"),
  name: text("name").notNull(),
  role: accountRole("role").default("BUYER").notNull(),
  twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    id: text("id").primaryKey(),
    impersonatedBy: text("impersonated_by"),
    ipAddress: text("ip_address"),
    token: text("token").notNull().unique(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)]
);

export const twoFactor = pgTable(
  "two_factor",
  {
    backupCodes: text("backup_codes").notNull(),
    failedVerificationCount: integer("failed_verification_count")
      .default(0)
      .notNull(),
    id: text("id").primaryKey(),
    lockedUntil: timestamp("locked_until"),
    secret: text("secret").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    verified: boolean("verified").default(true).notNull(),
  },
  (table) => [
    index("two_factor_secret_idx").on(table.secret),
    index("two_factor_userId_idx").on(table.userId),
  ]
);

export const auditLog = pgTable(
  "audit_log",
  {
    action: text("action").notNull(),
    actorUserId: text("actor_user_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    ipAddress: text("ip_address"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    outcome: auditOutcome("outcome").notNull(),
    purpose: text("purpose"),
    sessionId: text("session_id"),
    targetId: text("target_id"),
    targetType: text("target_type"),
  },
  (table) => [
    index("audit_log_actor_idx").on(table.actorUserId),
    index("audit_log_created_at_idx").on(table.createdAt),
  ]
);

export const protectionAdminAssignment = pgTable(
  "protection_admin_assignment",
  {
    capability: protectionAdminCapability("capability").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("protection_admin_assignment_user_idx").on(table.userId),
    uniqueIndex("protection_admin_assignment_user_capability_idx").on(
      table.userId,
      table.capability
    ),
  ]
);

export const account = pgTable(
  "account",
  {
    accessToken: text("access_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    accountId: text("account_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: text("id").primaryKey(),
    idToken: text("id_token"),
    password: text("password"),
    providerId: text("provider_id").notNull(),
    refreshToken: text("refresh_token"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("account_userId_idx").on(table.userId)]
);

export const verification = pgTable(
  "verification",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    value: text("value").notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);

export const userRelations = relations(user, ({ many }) => ({
  accounts: many(account),
  protectionAdminAssignments: many(protectionAdminAssignment),
  sessions: many(session),
  twoFactors: many(twoFactor),
}));

export const protectionAdminAssignmentRelations = relations(
  protectionAdminAssignment,
  ({ one }) => ({
    user: one(user, {
      fields: [protectionAdminAssignment.userId],
      references: [user.id],
    }),
  })
);

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const twoFactorRelations = relations(twoFactor, ({ one }) => ({
  user: one(user, {
    fields: [twoFactor.userId],
    references: [user.id],
  }),
}));
