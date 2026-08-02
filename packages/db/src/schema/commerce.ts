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

export const orderItemStatus = pgEnum("order_item_status", [
  "AWAITING_SELLER",
  "IN_PROGRESS",
  "DELIVERED",
  "IN_WARRANTY",
  "COMPLETED",
  "DISPUTED",
  "CANCELLED",
]);

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
    commissionRatePercent: numeric("commission_rate_percent", {
      precision: 5,
      scale: 2,
    }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
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
    warrantyPolicy: jsonb("warranty_policy")
      .$type<WarrantyPolicySnapshot>()
      .notNull(),
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
  escrowHold: one(escrowHold),
  listing: one(listing, {
    fields: [orderItem.listingId],
    references: [listing.id],
  }),
  order: one(order, {
    fields: [orderItem.orderId],
    references: [order.id],
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
