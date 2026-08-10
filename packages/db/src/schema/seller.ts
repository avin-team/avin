import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod";

import { user } from "./auth";

export const bankAccountSchema = z.object({
  accountName: z.string().min(1),
  accountNumber: z.string().min(1),
  bankName: z.string().min(1),
});

export type BankAccount = z.infer<typeof bankAccountSchema>;

export const sellerApplicationStatus = pgEnum("seller_application_status", [
  "PENDING_REVIEW",
  "APPROVED",
  "CHANGES_REQUESTED",
  "REJECTED",
]);

export const sellerProfile = pgTable(
  "seller_profile",
  {
    avatarUrl: text("avatar_url"),
    bankAccount: jsonb("bank_account").$type<BankAccount>(),
    bannerUrl: text("banner_url"),
    bio: text("bio"),
    completedOrderCount: integer("completed_order_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    phone: text("phone"),
    phoneVerified: boolean("phone_verified").default(false).notNull(),
    ratingCount: integer("rating_count").default(0).notNull(),
    ratingScore: numeric("rating_score", { precision: 3, scale: 2 })
      .default("0")
      .notNull(),
    storeSlug: text("store_slug").notNull(),
    storeSlugLockedAt: timestamp("store_slug_locked_at"),
    storefrontName: text("storefront_name").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("seller_profile_user_id_idx").on(table.userId),
    uniqueIndex("seller_profile_store_slug_idx").on(table.storeSlug),
    index("seller_profile_phone_idx").on(table.phone),
  ]
);

export const sellerApplication = pgTable(
  "seller_application",
  {
    applicantName: text("applicant_name").notNull(),
    bankAccount: jsonb("bank_account").$type<BankAccount>().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    email: text("email").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    phone: text("phone").notNull(),
    reviewReason: text("review_reason"),
    revisionCount: integer("revision_count").default(0).notNull(),
    sellerAgreementAcceptedAt: timestamp("seller_agreement_accepted_at")
      .defaultNow()
      .notNull(),
    sellerAgreementVersion: text("seller_agreement_version").notNull(),
    sellerProfileId: uuid("seller_profile_id")
      .notNull()
      .references(() => sellerProfile.id, { onDelete: "cascade" }),
    status: sellerApplicationStatus("status")
      .default("PENDING_REVIEW")
      .notNull(),
    storefrontName: text("storefront_name").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("seller_application_user_id_idx").on(table.userId),
    index("seller_application_profile_id_idx").on(table.sellerProfileId),
    index("seller_application_status_idx").on(table.status),
  ]
);

export const sellerProfileRelations = relations(
  sellerProfile,
  ({ one, many }) => ({
    applications: many(sellerApplication),
    user: one(user, {
      fields: [sellerProfile.userId],
      references: [user.id],
    }),
  })
);

export const sellerApplicationRelations = relations(
  sellerApplication,
  ({ one }) => ({
    profile: one(sellerProfile, {
      fields: [sellerApplication.sellerProfileId],
      references: [sellerProfile.id],
    }),
    user: one(user, {
      fields: [sellerApplication.userId],
      references: [user.id],
    }),
  })
);
