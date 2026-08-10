import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { listing, servicePackage } from "./catalog";
import type { WarrantyPolicy } from "./catalog";
import { ledgerTransaction } from "./wallet";

export interface ListingSnapshot {
  categoryId: string;
  description: string | null;
  images: string[];
  slug: string;
  thumbnailUrl: string | null;
  title: string;
  type: "COURSE" | "SERVICE";
}

export interface LegacyWarrantyPolicySnapshot {
  durationHours: number;
  terms: string;
}

export type WarrantyPolicySnapshot =
  | WarrantyPolicy
  | LegacyWarrantyPolicySnapshot;

export interface ServicePackageSnapshot {
  description: string;
  id: string;
  name: string;
  priceAmount: number;
  processingTimeHours: number;
  scope?: string;
  warrantyPolicy: WarrantyPolicySnapshot;
}

export const orderItemStatusValues = [
  "AWAITING_SELLER",
  "IN_PROGRESS",
  "DELIVERED",
  "IN_WARRANTY",
  "CLOSED",
  "DISPUTED",
  "CANCELLED",
  "REFUNDED",
] as const;

export const orderItemStatus = pgEnum(
  "order_item_status",
  orderItemStatusValues
);
export type OrderItemStatus = (typeof orderItemStatusValues)[number];

export const orderItemActorType = pgEnum("order_item_actor_type", [
  "BUYER",
  "SELLER",
  "ADMIN",
  "SYSTEM",
]);

export const disputeStatusValues = [
  "OPEN",
  "CANCELLED",
  "RESOLVED_REFUNDED",
  "RESOLVED_RELEASED",
] as const;

export const disputeStatus = pgEnum("dispute_status", disputeStatusValues);
export type DisputeStatus = (typeof disputeStatusValues)[number];

export const disputeEvidenceSubmitterRole = pgEnum(
  "dispute_evidence_submitter_role",
  ["BUYER", "SELLER"]
);

export const escrowHoldStatus = pgEnum("escrow_hold_status", [
  "HELD",
  "RELEASED",
  "REFUNDED",
  "CANCELLED",
]);

export const orderMessageSenderRole = pgEnum("order_message_sender_role", [
  "buyer",
  "seller",
  "admin",
]);

export const orderMessageType = pgEnum("order_message_type", [
  "text",
  "system",
  "admin_mediation",
]);

export const cart = pgTable(
  "cart",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [uniqueIndex("cart_user_id_unique_idx").on(table.userId)]
);

export const cartItem = pgTable(
  "cart_item",
  {
    cartId: uuid("cart_id")
      .notNull()
      .references(() => cart.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listing.id, { onDelete: "restrict" }),
    selected: boolean("selected").default(true).notNull(),
    servicePackageId: uuid("service_package_id").references(
      () => servicePackage.id,
      { onDelete: "set null" }
    ),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("cart_item_cart_listing_unique_idx").on(
      table.cartId,
      table.listingId
    ),
    index("cart_item_cart_selected_idx").on(table.cartId, table.selected),
    index("cart_item_service_package_id_idx").on(table.servicePackageId),
  ]
);

export const checkout = pgTable(
  "checkout",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    idempotencyKey: text("idempotency_key").notNull(),
    purchaseTransactionId: uuid("purchase_transaction_id")
      .notNull()
      .references(() => ledgerTransaction.id, { onDelete: "restrict" }),
    requestFingerprint: text("request_fingerprint").notNull(),
    totalAmount: integer("total_amount").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
  },
  (table) => [
    uniqueIndex("checkout_user_idempotency_key_unique_idx").on(
      table.userId,
      table.idempotencyKey
    ),
    uniqueIndex("checkout_purchase_transaction_unique_idx").on(
      table.purchaseTransactionId
    ),
    index("checkout_user_created_at_idx").on(table.userId, table.createdAt),
    check(
      "checkout_total_amount_positive_check",
      sql`${table.totalAmount} > 0`
    ),
  ]
);

export const checkoutAttachmentDraft = pgTable(
  "checkout_attachment_draft",
  {
    byteSize: integer("byte_size").notNull(),
    checkoutKey: text("checkout_key").notNull(),
    contentType: text("content_type").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    fileName: text("file_name").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listing.id, { onDelete: "restrict" }),
    storageKey: text("storage_key").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("checkout_attachment_draft_user_key_idx").on(
      table.userId,
      table.checkoutKey
    ),
    index("checkout_attachment_draft_listing_idx").on(table.listingId),
    uniqueIndex("checkout_attachment_draft_storage_key_unique_idx").on(
      table.storageKey
    ),
  ]
);

export const order = pgTable(
  "order",
  {
    buyerId: text("buyer_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    checkoutId: uuid("checkout_id")
      .notNull()
      .references(() => checkout.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    currency: text("currency").default("VND").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    sellerId: text("seller_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    totalAmount: integer("total_amount").notNull(),
  },
  (table) => [
    uniqueIndex("order_checkout_seller_unique_idx").on(
      table.checkoutId,
      table.sellerId
    ),
    index("order_buyer_created_at_idx").on(table.buyerId, table.createdAt),
    index("order_seller_created_at_idx").on(table.sellerId, table.createdAt),
    check("order_total_amount_positive_check", sql`${table.totalAmount} > 0`),
  ]
);

export const orderItem = pgTable(
  "order_item",
  {
    buyerDescription: text("buyer_description"),
    cancelledAt: timestamp("cancelled_at"),
    commissionRatePercent: numeric("commission_rate_percent", {
      precision: 5,
      scale: 2,
    }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    deliveredAt: timestamp("delivered_at"),
    deliveryReviewDeadlineAt: timestamp("delivery_review_deadline_at"),
    disputedAt: timestamp("disputed_at"),
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listing.id, { onDelete: "restrict" }),
    listingSnapshot: jsonb("listing_snapshot")
      .$type<ListingSnapshot>()
      .notNull(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "restrict" }),
    priceAmount: integer("price_amount").notNull(),
    processingDeadlineAt: timestamp("processing_deadline_at").notNull(),
    processingTimeHours: integer("processing_time_hours").notNull(),
    quantity: integer("quantity").default(1).notNull(),
    servicePackageId: uuid("service_package_id").references(
      () => servicePackage.id,
      { onDelete: "restrict" }
    ),
    servicePackageSnapshot: jsonb(
      "service_package_snapshot"
    ).$type<ServicePackageSnapshot | null>(),
    status: orderItemStatus("status").default("AWAITING_SELLER").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    warrantyExpiresAt: timestamp("warranty_expires_at"),
    warrantyPolicy: jsonb("warranty_policy")
      .$type<WarrantyPolicySnapshot>()
      .notNull(),
    warrantyStartedAt: timestamp("warranty_started_at"),
  },
  (table) => [
    index("order_item_order_id_idx").on(table.orderId),
    index("order_item_listing_id_idx").on(table.listingId),
    index("order_item_service_package_id_idx").on(table.servicePackageId),
    index("order_item_status_idx").on(table.status),
    check("order_item_price_positive_check", sql`${table.priceAmount} > 0`),
    check("order_item_quantity_one_check", sql`${table.quantity} = 1`),
    check(
      "order_item_processing_time_positive_check",
      sql`${table.processingTimeHours} > 0`
    ),
  ]
);

export const deliverySubmission = pgTable(
  "delivery_submission",
  {
    commandKey: text("command_key").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    deliveredAt: timestamp("delivered_at").notNull(),
    deliveryNote: text("delivery_note"),
    id: uuid("id").defaultRandom().primaryKey(),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItem.id, { onDelete: "restrict" }),
    sellerId: text("seller_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
  },
  (table) => [
    uniqueIndex("delivery_submission_order_item_unique_idx").on(
      table.orderItemId
    ),
    uniqueIndex("delivery_submission_item_command_unique_idx").on(
      table.orderItemId,
      table.commandKey
    ),
    index("delivery_submission_seller_idx").on(table.sellerId),
  ]
);

export const orderMessage = pgTable(
  "order_message",
  {
    content: text("content"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "restrict" }),
    redactedAt: timestamp("redacted_at"),
    redactedByUserId: text("redacted_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    senderId: text("sender_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    senderRole: orderMessageSenderRole("sender_role").notNull(),
    type: orderMessageType("type").default("text").notNull(),
  },
  (table) => [
    index("order_message_order_idx").on(table.orderId),
    index("order_message_order_created_idx").on(table.orderId, table.createdAt),
  ]
);

export const chatReadCursor = pgTable(
  "chat_read_cursor",
  {
    lastReadMessageId: uuid("last_read_message_id").references(
      () => orderMessage.id,
      { onDelete: "set null" }
    ),
    orderId: uuid("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.orderId, table.userId] }),
    index("chat_read_cursor_order_user_idx").on(table.orderId, table.userId),
  ]
);

export const orderFile = pgTable(
  "order_file",
  {
    byteSize: integer("byte_size"),
    contentType: text("content_type").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    deliverySubmissionId: uuid("delivery_submission_id").references(
      () => deliverySubmission.id,
      { onDelete: "restrict" }
    ),
    fileName: text("file_name").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "restrict" }),
    orderItemId: uuid("order_item_id").references(() => orderItem.id, {
      onDelete: "restrict",
    }),
    orderMessageId: uuid("order_message_id").references(() => orderMessage.id, {
      onDelete: "set null",
    }),
    storageKey: text("storage_key").notNull(),
    uploadedByUserId: text("uploaded_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
  },
  (table) => [
    index("order_file_order_idx").on(table.orderId),
    index("order_file_order_item_idx").on(table.orderItemId),
    index("order_file_delivery_submission_idx").on(table.deliverySubmissionId),
    index("order_file_order_message_idx").on(table.orderMessageId),
    uniqueIndex("order_file_storage_key_unique_idx").on(table.storageKey),
  ]
);

export const orderItemLifecycleEvent = pgTable(
  "order_item_lifecycle_event",
  {
    actorType: orderItemActorType("actor_type").notNull(),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    artifactId: uuid("artifact_id"),
    artifactType: text("artifact_type"),
    commandKey: text("command_key").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    effectiveAt: timestamp("effective_at").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    newStatus: orderItemStatus("new_status").notNull(),
    oldStatus: orderItemStatus("old_status"),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItem.id, { onDelete: "restrict" }),
    reason: text("reason"),
  },
  (table) => [
    uniqueIndex("order_item_lifecycle_event_item_command_unique_idx").on(
      table.orderItemId,
      table.commandKey
    ),
    index("order_item_lifecycle_event_item_effective_idx").on(
      table.orderItemId,
      table.effectiveAt
    ),
  ]
);

export const dispute = pgTable(
  "dispute",
  {
    adminDecisionDeadlineAt: timestamp("admin_decision_deadline_at"),
    buyerId: text("buyer_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    commandKey: text("command_key").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    openedAt: timestamp("opened_at").notNull(),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItem.id, { onDelete: "restrict" }),
    previousOrderItemStatus: orderItemStatus(
      "previous_order_item_status"
    ).notNull(),
    reason: text("reason").notNull(),
    resolutionNote: text("resolution_note"),
    resolvedAt: timestamp("resolved_at"),
    resolvedByUserId: text("resolved_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    responseDeadlineAt: timestamp("response_deadline_at").notNull(),
    status: disputeStatus("status").default("OPEN").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("dispute_order_item_unique_idx").on(table.orderItemId),
    uniqueIndex("dispute_item_command_unique_idx").on(
      table.orderItemId,
      table.commandKey
    ),
    index("dispute_status_opened_idx").on(table.status, table.openedAt),
  ]
);

export const disputeEvidence = pgTable(
  "dispute_evidence",
  {
    byteSize: integer("byte_size"),
    contentType: text("content_type").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    description: text("description").notNull(),
    disputeId: uuid("dispute_id")
      .notNull()
      .references(() => dispute.id, { onDelete: "restrict" }),
    fileName: text("file_name").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    storageKey: text("storage_key").notNull(),
    submittedAt: timestamp("submitted_at").defaultNow().notNull(),
    submittedByUserId: text("submitted_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    submittedLate: boolean("submitted_late").default(false).notNull(),
    submitterRole: disputeEvidenceSubmitterRole("submitter_role").notNull(),
  },
  (table) => [
    index("dispute_evidence_dispute_submitted_idx").on(
      table.disputeId,
      table.submittedAt
    ),
    uniqueIndex("dispute_evidence_storage_key_unique_idx").on(table.storageKey),
  ]
);

export const notification = pgTable(
  "notification",
  {
    body: text("body").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    lifecycleEventId: uuid("lifecycle_event_id")
      .notNull()
      .references(() => orderItemLifecycleEvent.id, { onDelete: "restrict" }),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItem.id, { onDelete: "restrict" }),
    readAt: timestamp("read_at"),
    recipientUserId: text("recipient_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
  },
  (table) => [
    uniqueIndex("notification_event_recipient_unique_idx").on(
      table.lifecycleEventId,
      table.recipientUserId
    ),
    index("notification_recipient_created_idx").on(
      table.recipientUserId,
      table.createdAt
    ),
  ]
);

export const escrowHold = pgTable(
  "escrow_hold",
  {
    amount: integer("amount").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItem.id, { onDelete: "restrict" }),
    purchaseTransactionId: uuid("purchase_transaction_id")
      .notNull()
      .references(() => ledgerTransaction.id, { onDelete: "restrict" }),
    status: escrowHoldStatus("status").default("HELD").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("escrow_hold_order_item_unique_idx").on(table.orderItemId),
    index("escrow_hold_transaction_idx").on(table.purchaseTransactionId),
    index("escrow_hold_status_idx").on(table.status),
    check("escrow_hold_amount_positive_check", sql`${table.amount} > 0`),
  ]
);

export const reviewModerationAction = pgEnum("review_moderation_action", [
  "HIDE",
  "RESTORE",
]);

export const review = pgTable(
  "review",
  {
    buyerId: text("buyer_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    comment: text("comment"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    hiddenAt: timestamp("hidden_at"),
    hiddenByUserId: text("hidden_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    hiddenReason: text("hidden_reason"),
    id: uuid("id").defaultRandom().primaryKey(),
    isHidden: boolean("is_hidden").default(false).notNull(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listing.id, { onDelete: "restrict" }),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItem.id, { onDelete: "restrict" }),
    rating: integer("rating").notNull(),
    reviewerMaskedName: text("reviewer_masked_name").notNull(),
    sellerId: text("seller_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    servicePackageName: text("service_package_name"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("review_order_item_unique_idx").on(table.orderItemId),
    index("review_listing_id_idx").on(table.listingId),
    index("review_seller_id_idx").on(table.sellerId),
    index("review_buyer_id_idx").on(table.buyerId),
    index("review_is_hidden_idx").on(table.isHidden),
    index("review_listing_created_idx").on(
      table.listingId,
      table.isHidden,
      table.createdAt
    ),
    check(
      "review_rating_range_check",
      sql`${table.rating} >= 1 AND ${table.rating} <= 5`
    ),
  ]
);

export const reviewModerationAudit = pgTable(
  "review_moderation_audit",
  {
    action: reviewModerationAction("action").notNull(),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    reason: text("reason").notNull(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => review.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("review_moderation_audit_review_idx").on(table.reviewId),
    index("review_moderation_audit_actor_idx").on(table.actorUserId),
  ]
);

export const cartRelations = relations(cart, ({ many, one }) => ({
  items: many(cartItem),
  user: one(user, {
    fields: [cart.userId],
    references: [user.id],
  }),
}));

export const cartItemRelations = relations(cartItem, ({ one }) => ({
  cart: one(cart, {
    fields: [cartItem.cartId],
    references: [cart.id],
  }),
  listing: one(listing, {
    fields: [cartItem.listingId],
    references: [listing.id],
  }),
  servicePackage: one(servicePackage, {
    fields: [cartItem.servicePackageId],
    references: [servicePackage.id],
  }),
}));

export const checkoutRelations = relations(checkout, ({ many, one }) => ({
  orders: many(order),
  purchaseTransaction: one(ledgerTransaction, {
    fields: [checkout.purchaseTransactionId],
    references: [ledgerTransaction.id],
  }),
  user: one(user, {
    fields: [checkout.userId],
    references: [user.id],
  }),
}));

export const checkoutAttachmentDraftRelations = relations(
  checkoutAttachmentDraft,
  ({ one }) => ({
    listing: one(listing, {
      fields: [checkoutAttachmentDraft.listingId],
      references: [listing.id],
    }),
    user: one(user, {
      fields: [checkoutAttachmentDraft.userId],
      references: [user.id],
    }),
  })
);

export const orderRelations = relations(order, ({ many, one }) => ({
  buyer: one(user, {
    fields: [order.buyerId],
    references: [user.id],
  }),
  checkout: one(checkout, {
    fields: [order.checkoutId],
    references: [checkout.id],
  }),
  items: many(orderItem),
  seller: one(user, {
    fields: [order.sellerId],
    references: [user.id],
  }),
}));

export const orderItemRelations = relations(orderItem, ({ many, one }) => ({
  deliverySubmission: one(deliverySubmission),
  dispute: one(dispute),
  escrowHold: one(escrowHold),
  files: many(orderFile),
  lifecycleEvents: many(orderItemLifecycleEvent),
  listing: one(listing, {
    fields: [orderItem.listingId],
    references: [listing.id],
  }),
  notifications: many(notification),
  order: one(order, {
    fields: [orderItem.orderId],
    references: [order.id],
  }),
  review: one(review),
  servicePackage: one(servicePackage, {
    fields: [orderItem.servicePackageId],
    references: [servicePackage.id],
  }),
}));

export const deliverySubmissionRelations = relations(
  deliverySubmission,
  ({ many, one }) => ({
    files: many(orderFile),
    orderItem: one(orderItem, {
      fields: [deliverySubmission.orderItemId],
      references: [orderItem.id],
    }),
    seller: one(user, {
      fields: [deliverySubmission.sellerId],
      references: [user.id],
    }),
  })
);

export const orderFileRelations = relations(orderFile, ({ one }) => ({
  deliverySubmission: one(deliverySubmission, {
    fields: [orderFile.deliverySubmissionId],
    references: [deliverySubmission.id],
  }),
  order: one(order, {
    fields: [orderFile.orderId],
    references: [order.id],
  }),
  orderItem: one(orderItem, {
    fields: [orderFile.orderItemId],
    references: [orderItem.id],
  }),
  orderMessage: one(orderMessage, {
    fields: [orderFile.orderMessageId],
    references: [orderMessage.id],
  }),
  uploadedBy: one(user, {
    fields: [orderFile.uploadedByUserId],
    references: [user.id],
  }),
}));

export const orderItemLifecycleEventRelations = relations(
  orderItemLifecycleEvent,
  ({ one }) => ({
    actor: one(user, {
      fields: [orderItemLifecycleEvent.actorUserId],
      references: [user.id],
    }),
    orderItem: one(orderItem, {
      fields: [orderItemLifecycleEvent.orderItemId],
      references: [orderItem.id],
    }),
  })
);

export const disputeRelations = relations(dispute, ({ many, one }) => ({
  buyer: one(user, {
    fields: [dispute.buyerId],
    references: [user.id],
  }),
  evidence: many(disputeEvidence),
  orderItem: one(orderItem, {
    fields: [dispute.orderItemId],
    references: [orderItem.id],
  }),
  resolvedBy: one(user, {
    fields: [dispute.resolvedByUserId],
    references: [user.id],
  }),
}));

export const disputeEvidenceRelations = relations(
  disputeEvidence,
  ({ one }) => ({
    dispute: one(dispute, {
      fields: [disputeEvidence.disputeId],
      references: [dispute.id],
    }),
    submittedBy: one(user, {
      fields: [disputeEvidence.submittedByUserId],
      references: [user.id],
    }),
  })
);

export const notificationRelations = relations(notification, ({ one }) => ({
  lifecycleEvent: one(orderItemLifecycleEvent, {
    fields: [notification.lifecycleEventId],
    references: [orderItemLifecycleEvent.id],
  }),
  orderItem: one(orderItem, {
    fields: [notification.orderItemId],
    references: [orderItem.id],
  }),
  recipient: one(user, {
    fields: [notification.recipientUserId],
    references: [user.id],
  }),
}));

export const escrowHoldRelations = relations(escrowHold, ({ one }) => ({
  orderItem: one(orderItem, {
    fields: [escrowHold.orderItemId],
    references: [orderItem.id],
  }),
  purchaseTransaction: one(ledgerTransaction, {
    fields: [escrowHold.purchaseTransactionId],
    references: [ledgerTransaction.id],
  }),
}));

export const orderMessageRelations = relations(
  orderMessage,
  ({ many, one }) => ({
    attachments: many(orderFile),
    order: one(order, {
      fields: [orderMessage.orderId],
      references: [order.id],
    }),
    redactedBy: one(user, {
      fields: [orderMessage.redactedByUserId],
      references: [user.id],
    }),
    sender: one(user, {
      fields: [orderMessage.senderId],
      references: [user.id],
    }),
  })
);

export const chatReadCursorRelations = relations(chatReadCursor, ({ one }) => ({
  lastReadMessage: one(orderMessage, {
    fields: [chatReadCursor.lastReadMessageId],
    references: [orderMessage.id],
  }),
  order: one(order, {
    fields: [chatReadCursor.orderId],
    references: [order.id],
  }),
  user: one(user, {
    fields: [chatReadCursor.userId],
    references: [user.id],
  }),
}));

export const reviewRelations = relations(review, ({ many, one }) => ({
  buyer: one(user, {
    fields: [review.buyerId],
    references: [user.id],
  }),
  listing: one(listing, {
    fields: [review.listingId],
    references: [listing.id],
  }),
  moderationAudits: many(reviewModerationAudit),
  orderItem: one(orderItem, {
    fields: [review.orderItemId],
    references: [orderItem.id],
  }),
  seller: one(user, {
    fields: [review.sellerId],
    references: [user.id],
  }),
}));

export const reviewModerationAuditRelations = relations(
  reviewModerationAudit,
  ({ one }) => ({
    actor: one(user, {
      fields: [reviewModerationAudit.actorUserId],
      references: [user.id],
    }),
    review: one(review, {
      fields: [reviewModerationAudit.reviewId],
      references: [review.id],
    }),
  })
);
