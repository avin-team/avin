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
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { listing } from "./catalog";
import type { ServiceInputField } from "./catalog";
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

export interface WarrantyPolicySnapshot {
  durationHours: number;
  terms: string;
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

export const disputeStatus = pgEnum("dispute_status", ["OPEN"]);

export const escrowHoldStatus = pgEnum("escrow_hold_status", [
  "HELD",
  "RELEASED",
  "REFUNDED",
  "CANCELLED",
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
    serviceInputFields: jsonb("service_input_fields")
      .$type<ServiceInputField[]>()
      .notNull(),
    status: orderItemStatus("status").default("AWAITING_SELLER").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    warrantyPolicy: jsonb("warranty_policy")
      .$type<WarrantyPolicySnapshot>()
      .notNull(),
    warrantyExpiresAt: timestamp("warranty_expires_at"),
    warrantyStartedAt: timestamp("warranty_started_at"),
  },
  (table) => [
    index("order_item_order_id_idx").on(table.orderId),
    index("order_item_listing_id_idx").on(table.listingId),
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
    deliveryNote: text("delivery_note").notNull(),
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
    storageKey: text("storage_key").notNull(),
    uploadedByUserId: text("uploaded_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
  },
  (table) => [
    index("order_file_order_idx").on(table.orderId),
    index("order_file_order_item_idx").on(table.orderItemId),
    index("order_file_delivery_submission_idx").on(table.deliverySubmissionId),
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
    reason: text("reason").notNull(),
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

export const orderCustomInput = pgTable(
  "order_custom_input",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    fieldKey: text("field_key").notNull(),
    fieldType: text("field_type").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItem.id, { onDelete: "restrict" }),
    value: jsonb("value").$type<unknown>().notNull(),
  },
  (table) => [
    uniqueIndex("order_custom_input_item_key_unique_idx").on(
      table.orderItemId,
      table.fieldKey
    ),
    index("order_custom_input_item_idx").on(table.orderItemId),
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
  customInputs: many(orderCustomInput),
  deliverySubmission: one(deliverySubmission),
  dispute: one(dispute),
  escrowHold: one(escrowHold),
  listing: one(listing, {
    fields: [orderItem.listingId],
    references: [listing.id],
  }),
  lifecycleEvents: many(orderItemLifecycleEvent),
  notifications: many(notification),
  files: many(orderFile),
  order: one(order, {
    fields: [orderItem.orderId],
    references: [order.id],
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

export const disputeRelations = relations(dispute, ({ one }) => ({
  buyer: one(user, {
    fields: [dispute.buyerId],
    references: [user.id],
  }),
  orderItem: one(orderItem, {
    fields: [dispute.orderItemId],
    references: [orderItem.id],
  }),
}));

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

export const orderCustomInputRelations = relations(
  orderCustomInput,
  ({ one }) => ({
    orderItem: one(orderItem, {
      fields: [orderCustomInput.orderItemId],
      references: [orderItem.id],
    }),
  })
);

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
