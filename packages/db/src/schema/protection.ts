import {
  boolean,
  date,
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
import { z } from "zod";

import { user } from "./auth";

export const protectionProviderApplicationStatus = pgEnum(
  "protection_provider_application_status",
  ["DRAFT", "PENDING_REVIEW", "CHANGES_REQUESTED", "APPROVED", "REJECTED"]
);

export const protectionProviderProfileStatus = pgEnum(
  "protection_provider_profile_status",
  [
    "ACTIVE",
    "SUSPENDED_PENDING_REVIEW",
    "WITHDRAWAL_PENDING",
    "WITHDRAWN",
    "REMOVED_FOR_FRAUD",
  ]
);

export const providerOfficialChannelsSchema = z.object({
  facebookUrl: z.url().optional(),
  websiteUrl: z.url().optional(),
  zalo: z.string().trim().max(100).optional(),
});

export type ProviderOfficialChannels = z.infer<
  typeof providerOfficialChannelsSchema
>;

export const providerPaymentAccountSchema = z.object({
  accountName: z.string().trim().min(1).max(200),
  accountNumber: z.string().trim().min(1).max(100),
  accountType: z.enum(["BANK", "WALLET"]),
  institution: z.string().trim().min(1).max(200),
});

export type ProviderPaymentAccount = z.infer<
  typeof providerPaymentAccountSchema
>;

export const protectionProviderApplication = pgTable(
  "protection_provider_application",
  {
    ageEvidenceReference: text("age_evidence_reference"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    fullName: text("full_name"),
    id: uuid("id").defaultRandom().primaryKey(),
    identityEvidenceReference: text("identity_evidence_reference"),
    officialChannelEvidenceReference: text(
      "official_channel_evidence_reference"
    ),
    officialChannels:
      jsonb("official_channels").$type<ProviderOfficialChannels>(),
    operatingHistoryEvidenceReference: text(
      "operating_history_evidence_reference"
    ),
    operatingSince: date("operating_since", { mode: "string" }),
    paymentAccount: jsonb("payment_account").$type<ProviderPaymentAccount>(),
    paymentDisclosureConsent: boolean("payment_disclosure_consent"),
    paymentEvidenceReference: text("payment_evidence_reference"),
    policyAcceptedAt: timestamp("policy_accepted_at"),
    policyVersion: text("policy_version"),
    providerUserId: text("provider_user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    reviewReason: text("review_reason"),
    reviewedAt: timestamp("reviewed_at"),
    reviewedByUserId: text("reviewed_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    revisionCount: integer("revision_count").default(0).notNull(),
    services: text("services"),
    status: protectionProviderApplicationStatus("status")
      .default("DRAFT")
      .notNull(),
    submittedAt: timestamp("submitted_at"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("protection_provider_application_status_idx").on(table.status),
    index("protection_provider_application_submitted_idx").on(
      table.submittedAt
    ),
    index("protection_provider_application_reviewer_idx").on(
      table.reviewedByUserId
    ),
  ]
);

export const protectionProviderProfile = pgTable(
  "protection_provider_profile",
  {
    applicationId: uuid("application_id")
      .notNull()
      .unique()
      .references(() => protectionProviderApplication.id, {
        onDelete: "restrict",
      }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    displayName: text("display_name").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    officialChannels: jsonb("official_channels")
      .$type<ProviderOfficialChannels>()
      .notNull(),
    profileSlug: text("profile_slug").notNull(),
    providerUserId: text("provider_user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    publishedAt: timestamp("published_at").defaultNow().notNull(),
    services: text("services").notNull(),
    status: protectionProviderProfileStatus("status")
      .default("ACTIVE")
      .notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    verifiedAt: timestamp("verified_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("protection_provider_profile_slug_idx").on(table.profileSlug),
    index("protection_provider_profile_status_idx").on(table.status),
  ]
);

export const protectionProviderProfileVersion = pgTable(
  "protection_provider_profile_version",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    displayName: text("display_name").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    officialChannels: jsonb("official_channels")
      .$type<ProviderOfficialChannels>()
      .notNull(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => protectionProviderProfile.id, {
        onDelete: "restrict",
      }),
    profileSlug: text("profile_slug").notNull(),
    publishedAt: timestamp("published_at").defaultNow().notNull(),
    publishedByUserId: text("published_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    services: text("services").notNull(),
    sourceApplicationId: uuid("source_application_id").references(
      () => protectionProviderApplication.id,
      { onDelete: "set null" }
    ),
    status: protectionProviderProfileStatus("status").notNull(),
    statusReason: text("status_reason"),
    verifiedAt: timestamp("verified_at").defaultNow().notNull(),
    versionNumber: integer("version_number").notNull(),
  },
  (table) => [
    uniqueIndex("protection_provider_profile_version_number_idx").on(
      table.profileId,
      table.versionNumber
    ),
    index("protection_provider_profile_version_slug_idx").on(table.profileSlug),
  ]
);

export const protectionProviderProfileRevision = pgTable(
  "protection_provider_profile_revision",
  {
    ageEvidenceReference: text("age_evidence_reference"),
    baseVersionId: uuid("base_version_id")
      .notNull()
      .references(() => protectionProviderProfileVersion.id, {
        onDelete: "restrict",
      }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    fullName: text("full_name"),
    id: uuid("id").defaultRandom().primaryKey(),
    identityEvidenceReference: text("identity_evidence_reference"),
    officialChannelEvidenceReference: text(
      "official_channel_evidence_reference"
    ),
    officialChannels:
      jsonb("official_channels").$type<ProviderOfficialChannels>(),
    operatingHistoryEvidenceReference: text(
      "operating_history_evidence_reference"
    ),
    operatingSince: date("operating_since", { mode: "string" }),
    paymentAccount: jsonb("payment_account").$type<ProviderPaymentAccount>(),
    paymentDisclosureConsent: boolean("payment_disclosure_consent"),
    paymentEvidenceReference: text("payment_evidence_reference"),
    policyAcceptedAt: timestamp("policy_accepted_at"),
    policyVersion: text("policy_version"),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => protectionProviderProfile.id, {
        onDelete: "restrict",
      }),
    providerUserId: text("provider_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reviewReason: text("review_reason"),
    reviewedAt: timestamp("reviewed_at"),
    reviewedByUserId: text("reviewed_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    revisionNumber: integer("revision_number").notNull(),
    services: text("services"),
    status: protectionProviderApplicationStatus("status")
      .default("DRAFT")
      .notNull(),
    submittedAt: timestamp("submitted_at"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("protection_provider_profile_revision_number_idx").on(
      table.profileId,
      table.revisionNumber
    ),
    index("protection_provider_profile_revision_status_idx").on(table.status),
    index("protection_provider_profile_revision_submitted_idx").on(
      table.submittedAt
    ),
  ]
);
