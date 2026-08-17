import { relations, sql } from "drizzle-orm";
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

import { user } from "./auth";
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

export const advisorMessageRole = pgEnum("advisor_message_role", [
  "USER",
  "ASSISTANT",
]);

export const advisorSessionStatus = pgEnum("advisor_session_status", [
  "ACTIVE",
  "COMPLETED",
  "EXPIRED",
  "DELETED",
]);

export const advisorGenerationStatus = pgEnum("advisor_generation_status", [
  "IDLE",
  "RUNNING",
  "STOPPED",
  "FAILED",
]);

export const advisorConsent = pgTable(
  "advisor_consent",
  {
    acceptedAt: timestamp("accepted_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    version: text("version").notNull(),
    visitorCapabilityHash: text("visitor_capability_hash"),
  },
  (table) => [
    index("advisor_consent_user_idx").on(table.userId),
    index("advisor_consent_visitor_capability_idx").on(
      table.visitorCapabilityHash
    ),
    index("advisor_consent_version_idx").on(table.version),
  ]
);

export const advisorSession = pgTable(
  "advisor_session",
  {
    answers: jsonb("answers")
      .$type<Record<string, string>>()
      .default({})
      .notNull(),
    consentId: uuid("consent_id")
      .notNull()
      .references(() => advisorConsent.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    creationIpHash: text("creation_ip_hash"),
    expiresAt: timestamp("expires_at").notNull(),
    generationStartedAt: timestamp("generation_started_at"),
    generationStatus: advisorGenerationStatus("generation_status")
      .default("IDLE")
      .notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    lastIdempotencyKey: text("last_idempotency_key"),
    lastTurnResponse:
      jsonb("last_turn_response").$type<Record<string, unknown>>(),
    pendingQuestionId: text("pending_question_id"),
    pinnedPlaybookId: uuid("pinned_playbook_id").references(
      () => advisorPlaybook.id,
      { onDelete: "restrict" }
    ),
    pinnedSubCategoryId: uuid("pinned_sub_category_id").references(
      () => subCategory.id,
      { onDelete: "restrict" }
    ),
    serviceNeed: text("service_need").default("").notNull(),
    status: advisorSessionStatus("status").default("ACTIVE").notNull(),
    turnCount: integer("turn_count").default(0).notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    visitorCapabilityHash: text("visitor_capability_hash"),
  },
  (table) => [
    index("advisor_session_user_status_idx").on(table.userId, table.status),
    index("advisor_session_visitor_status_idx").on(
      table.visitorCapabilityHash,
      table.status
    ),
    index("advisor_session_expires_at_idx").on(table.expiresAt),
    index("advisor_session_creation_ip_created_at_idx").on(
      table.creationIpHash,
      table.createdAt
    ),
    index("advisor_session_generation_status_idx").on(table.generationStatus),
    index("advisor_session_pinned_playbook_idx").on(table.pinnedPlaybookId),
  ]
);

export const advisorMessage = pgTable(
  "advisor_message",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    role: advisorMessageRole("role").notNull(),
    sequence: integer("sequence").notNull(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => advisorSession.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
  },
  (table) => [
    index("advisor_message_session_sequence_idx").on(
      table.sessionId,
      table.sequence
    ),
  ]
);

export const advisorAttachmentStatus = pgEnum("advisor_attachment_status", [
  "UPLOADED",
  "COMMITTED",
]);

export const advisorAttachment = pgTable(
  "advisor_attachment",
  {
    byteSize: integer("byte_size").notNull(),
    committedAt: timestamp("committed_at"),
    contentType: text("content_type").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    fileName: text("file_name").notNull(),
    height: integer("height").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    messageId: uuid("message_id").references(() => advisorMessage.id, {
      onDelete: "set null",
    }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => advisorSession.id, { onDelete: "cascade" }),
    status: advisorAttachmentStatus("status").default("UPLOADED").notNull(),
    storageKey: text("storage_key").notNull(),
    width: integer("width").notNull(),
  },
  (table) => [
    index("advisor_attachment_session_status_idx").on(
      table.sessionId,
      table.status
    ),
    index("advisor_attachment_expires_at_idx").on(table.expiresAt),
    uniqueIndex("advisor_attachment_storage_key_unique_idx").on(
      table.storageKey
    ),
  ]
);

export const advisorRecommendation = pgTable(
  "advisor_recommendation",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    isCurrent: boolean("is_current").default(true).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    playbookId: uuid("playbook_id")
      .notNull()
      .references(() => advisorPlaybook.id, { onDelete: "restrict" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => advisorSession.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("advisor_recommendation_session_current_idx").on(
      table.sessionId,
      table.isCurrent
    ),
    index("advisor_recommendation_playbook_idx").on(table.playbookId),
  ]
);

export const advisorHandoff = pgTable(
  "advisor_handoff",
  {
    attachmentIds: jsonb("attachment_ids")
      .$type<string[]>()
      .default([])
      .notNull(),
    confirmedAt: timestamp("confirmed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    includeSummaryInCheckout: boolean("include_summary_in_checkout")
      .default(false)
      .notNull(),
    recommendationId: uuid("recommendation_id")
      .notNull()
      .references(() => advisorRecommendation.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => advisorSession.id, { onDelete: "cascade" }),
    summary: text("summary").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("advisor_handoff_session_unique_idx").on(table.sessionId),
    index("advisor_handoff_recommendation_idx").on(table.recommendationId),
  ]
);

export const advisorConsentRelations = relations(
  advisorConsent,
  ({ one, many }) => ({
    sessions: many(advisorSession),
    user: one(user, {
      fields: [advisorConsent.userId],
      references: [user.id],
    }),
  })
);

export const advisorSessionRelations = relations(
  advisorSession,
  ({ many, one }) => ({
    attachments: many(advisorAttachment),
    consent: one(advisorConsent, {
      fields: [advisorSession.consentId],
      references: [advisorConsent.id],
    }),
    handoff: one(advisorHandoff),
    messages: many(advisorMessage),
    pinnedPlaybook: one(advisorPlaybook, {
      fields: [advisorSession.pinnedPlaybookId],
      references: [advisorPlaybook.id],
    }),
    pinnedSubCategory: one(subCategory, {
      fields: [advisorSession.pinnedSubCategoryId],
      references: [subCategory.id],
    }),
    recommendations: many(advisorRecommendation),
    user: one(user, {
      fields: [advisorSession.userId],
      references: [user.id],
    }),
  })
);

export const advisorMessageRelations = relations(
  advisorMessage,
  ({ many, one }) => ({
    attachments: many(advisorAttachment),
    session: one(advisorSession, {
      fields: [advisorMessage.sessionId],
      references: [advisorSession.id],
    }),
  })
);

export const advisorAttachmentRelations = relations(
  advisorAttachment,
  ({ one }) => ({
    message: one(advisorMessage, {
      fields: [advisorAttachment.messageId],
      references: [advisorMessage.id],
    }),
    session: one(advisorSession, {
      fields: [advisorAttachment.sessionId],
      references: [advisorSession.id],
    }),
  })
);

export const advisorRecommendationRelations = relations(
  advisorRecommendation,
  ({ one }) => ({
    handoff: one(advisorHandoff),
    playbook: one(advisorPlaybook, {
      fields: [advisorRecommendation.playbookId],
      references: [advisorPlaybook.id],
    }),
    session: one(advisorSession, {
      fields: [advisorRecommendation.sessionId],
      references: [advisorSession.id],
    }),
  })
);

export const advisorHandoffRelations = relations(advisorHandoff, ({ one }) => ({
  recommendation: one(advisorRecommendation, {
    fields: [advisorHandoff.recommendationId],
    references: [advisorRecommendation.id],
  }),
  session: one(advisorSession, {
    fields: [advisorHandoff.sessionId],
    references: [advisorSession.id],
  }),
}));

export const advisorFeedbackSentiment = pgEnum("advisor_feedback_sentiment", [
  "NEGATIVE",
  "POSITIVE",
]);

export const advisorAnalyticsEventType = pgEnum(
  "advisor_analytics_event_type",
  [
    "ANSWER_SUBMITTED",
    "ATTACHMENT_ADDED",
    "CHECKOUT_COMPLETED",
    "FEEDBACK_SUBMITTED",
    "LISTING_CLICKED",
    "MODEL_REQUEST",
    "NO_MATCH",
    "RECOMMENDATION_CREATED",
    "RECOMMENDATION_SELECTED",
    "SESSION_ABANDONED",
    "SESSION_STARTED",
    "SUMMARY_COPIED",
    "SUMMARY_CONFIRMED",
    "TURN_COMPLETED",
  ]
);

export const advisorAnalyticsRetention = pgEnum("advisor_analytics_retention", [
  "AGGREGATE",
  "TECHNICAL",
]);

export const advisorFeedback = pgTable(
  "advisor_feedback",
  {
    attachmentConsentAt: timestamp("attachment_consent_at"),
    attachmentIds: jsonb("attachment_ids")
      .$type<string[]>()
      .default([])
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    reason: text("reason"),
    recommendationId: uuid("recommendation_id")
      .notNull()
      .references(() => advisorRecommendation.id, { onDelete: "cascade" }),
    sentiment: advisorFeedbackSentiment("sentiment").notNull(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => advisorSession.id, { onDelete: "cascade" }),
    shareConversation: boolean("share_conversation").default(false).notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    visitorCapabilityHash: text("visitor_capability_hash"),
  },
  (table) => [
    uniqueIndex("advisor_feedback_session_recommendation_unique_idx").on(
      table.sessionId,
      table.recommendationId
    ),
    index("advisor_feedback_created_at_idx").on(table.createdAt),
    index("advisor_feedback_sentiment_idx").on(table.sentiment),
  ]
);

export const advisorAnalyticsEvent = pgTable(
  "advisor_analytics_event",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    eventType: advisorAnalyticsEventType("event_type").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    metadata: jsonb("metadata")
      .$type<Record<string, boolean | number | string | null>>()
      .default({})
      .notNull(),
    retention: advisorAnalyticsRetention("retention")
      .default("AGGREGATE")
      .notNull(),
    sessionId: uuid("session_id").references(() => advisorSession.id, {
      onDelete: "set null",
    }),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("advisor_analytics_event_type_created_at_idx").on(
      table.eventType,
      table.createdAt
    ),
    index("advisor_analytics_event_retention_created_at_idx").on(
      table.retention,
      table.createdAt
    ),
  ]
);

export const advisorFeedbackRelations = relations(
  advisorFeedback,
  ({ one }) => ({
    recommendation: one(advisorRecommendation, {
      fields: [advisorFeedback.recommendationId],
      references: [advisorRecommendation.id],
    }),
    session: one(advisorSession, {
      fields: [advisorFeedback.sessionId],
      references: [advisorSession.id],
    }),
    user: one(user, {
      fields: [advisorFeedback.userId],
      references: [user.id],
    }),
  })
);

export const advisorAnalyticsEventRelations = relations(
  advisorAnalyticsEvent,
  ({ one }) => ({
    session: one(advisorSession, {
      fields: [advisorAnalyticsEvent.sessionId],
      references: [advisorSession.id],
    }),
    user: one(user, {
      fields: [advisorAnalyticsEvent.userId],
      references: [user.id],
    }),
  })
);
