import { user } from "@avin/db/schema/auth";
import {
  escrowHold,
  order,
  orderCustomInput,
  orderItem,
} from "@avin/db/schema/commerce";
import type {
  ListingSnapshot,
  OrderItemStatus,
  WarrantyPolicySnapshot,
} from "@avin/db/schema/commerce";
import { asc, eq, inArray } from "drizzle-orm";

import type { CommerceExecutor } from "./cart";

export type { OrderItemStatus } from "@avin/db/schema/commerce";

export interface OrderItemSummary {
  deliveredAt: string | null;
  deliveryReviewDeadlineAt: string | null;
  escrowHold: {
    amount: number;
    id: string;
    status: "CANCELLED" | "HELD" | "REFUNDED" | "RELEASED";
  };
  id: string;
  listingId: string;
  listing: Pick<ListingSnapshot, "slug" | "thumbnailUrl" | "title" | "type">;
  priceAmount: number;
  processingDeadlineAt: string;
  processingTimeHours: number;
  status: OrderItemStatus;
  warrantyExpiresAt: string | null;
  warrantyPolicy: WarrantyPolicySnapshot;
}

interface OrderItemRow {
  deliveredAt: Date | null;
  deliveryReviewDeadlineAt: Date | null;
  escrowAmount: number;
  escrowHoldId: string;
  escrowHoldStatus: "CANCELLED" | "HELD" | "REFUNDED" | "RELEASED";
  id: string;
  listing: ListingSnapshot;
  listingId: string;
  orderId: string;
  priceAmount: number;
  processingDeadlineAt: Date;
  processingTimeHours: number;
  status: OrderItemStatus;
  warrantyExpiresAt: Date | null;
  warrantyPolicy: WarrantyPolicySnapshot;
}

const mapOrderItemSummary = (item: OrderItemRow): OrderItemSummary => ({
  deliveredAt: item.deliveredAt?.toISOString() ?? null,
  deliveryReviewDeadlineAt:
    item.deliveryReviewDeadlineAt?.toISOString() ?? null,
  escrowHold: {
    amount: item.escrowAmount,
    id: item.escrowHoldId,
    status: item.escrowHoldStatus,
  },
  id: item.id,
  listing: {
    slug: item.listing.slug,
    thumbnailUrl: item.listing.thumbnailUrl,
    title: item.listing.title,
    type: item.listing.type,
  },
  listingId: item.listingId,
  priceAmount: item.priceAmount,
  processingDeadlineAt: item.processingDeadlineAt.toISOString(),
  processingTimeHours: item.processingTimeHours,
  status: item.status,
  warrantyExpiresAt: item.warrantyExpiresAt?.toISOString() ?? null,
  warrantyPolicy: item.warrantyPolicy,
});

export interface SellerOrderView {
  buyerId: string;
  checkoutId: string;
  createdAt: string;
  currency: string;
  id: string;
  items: (OrderItemSummary & {
    customInputs: {
      fieldKey: string;
      fieldType: string;
      value: unknown;
    }[];
  })[];
  sellerId: string;
  totalAmount: number;
}

export interface BuyerOrderView {
  buyerId: string;
  checkoutId: string;
  createdAt: string;
  currency: string;
  id: string;
  items: OrderItemSummary[];
  seller: {
    id: string;
    image: string | null;
    name: string;
  };
  sellerId: string;
  totalAmount: number;
}

export const getSellerOrders = async (
  executor: CommerceExecutor,
  sellerId: string
): Promise<SellerOrderView[]> => {
  const orders = await executor
    .select({
      buyerEmail: user.email,
      buyerId: order.buyerId,
      buyerImage: user.image,
      buyerName: user.name,
      checkoutId: order.checkoutId,
      createdAt: order.createdAt,
      currency: order.currency,
      id: order.id,
      sellerId: order.sellerId,
      totalAmount: order.totalAmount,
    })
    .from(order)
    .innerJoin(user, eq(user.id, order.buyerId))
    .where(eq(order.sellerId, sellerId))
    .orderBy(asc(order.createdAt), asc(order.id));

  if (orders.length === 0) {
    return [];
  }

  const orderIds = orders.map(({ id }) => id);
  const itemRows = await executor
    .select({
      escrowAmount: escrowHold.amount,
      escrowHoldId: escrowHold.id,
      escrowHoldStatus: escrowHold.status,
      deliveredAt: orderItem.deliveredAt,
      deliveryReviewDeadlineAt: orderItem.deliveryReviewDeadlineAt,
      id: orderItem.id,
      listingId: orderItem.listingId,
      listing: orderItem.listingSnapshot,
      orderId: orderItem.orderId,
      priceAmount: orderItem.priceAmount,
      processingDeadlineAt: orderItem.processingDeadlineAt,
      processingTimeHours: orderItem.processingTimeHours,
      status: orderItem.status,
      warrantyExpiresAt: orderItem.warrantyExpiresAt,
      warrantyPolicy: orderItem.warrantyPolicy,
    })
    .from(orderItem)
    .innerJoin(escrowHold, eq(escrowHold.orderItemId, orderItem.id))
    .where(inArray(orderItem.orderId, orderIds))
    .orderBy(asc(orderItem.createdAt), asc(orderItem.id));

  const itemIds = itemRows.map(({ id }) => id);
  const inputRows = itemIds.length
    ? await executor
        .select({
          fieldKey: orderCustomInput.fieldKey,
          fieldType: orderCustomInput.fieldType,
          orderItemId: orderCustomInput.orderItemId,
          value: orderCustomInput.value,
        })
        .from(orderCustomInput)
        .where(inArray(orderCustomInput.orderItemId, itemIds))
        .orderBy(
          asc(orderCustomInput.orderItemId),
          asc(orderCustomInput.fieldKey)
        )
    : [];

  const inputsByItem = new Map<
    string,
    SellerOrderView["items"][number]["customInputs"]
  >();
  for (const input of inputRows) {
    const itemInputs = inputsByItem.get(input.orderItemId) ?? [];
    itemInputs.push({
      fieldKey: input.fieldKey,
      fieldType: input.fieldType,
      value: input.value,
    });
    inputsByItem.set(input.orderItemId, itemInputs);
  }

  const itemsByOrder = new Map<string, SellerOrderView["items"]>();
  for (const item of itemRows) {
    const orderItems = itemsByOrder.get(item.orderId) ?? [];
    orderItems.push({
      customInputs: inputsByItem.get(item.id) ?? [],
      ...mapOrderItemSummary(item),
    });
    itemsByOrder.set(item.orderId, orderItems);
  }

  return orders.map((item) => ({
    buyer: {
      email: item.buyerEmail,
      id: item.buyerId,
      image: item.buyerImage,
      name: item.buyerName,
    },
    buyerId: item.buyerId,
    checkoutId: item.checkoutId,
    createdAt: item.createdAt.toISOString(),
    currency: item.currency,
    id: item.id,
    items: itemsByOrder.get(item.id) ?? [],
    sellerId: item.sellerId,
    totalAmount: item.totalAmount,
  }));
};

export const getBuyerOrders = async (
  executor: CommerceExecutor,
  buyerId: string
): Promise<BuyerOrderView[]> => {
  const orders = await executor
    .select({
      buyerId: order.buyerId,
      checkoutId: order.checkoutId,
      createdAt: order.createdAt,
      currency: order.currency,
      id: order.id,
      sellerId: order.sellerId,
      sellerImage: user.image,
      sellerName: user.name,
      totalAmount: order.totalAmount,
    })
    .from(order)
    .innerJoin(user, eq(user.id, order.sellerId))
    .where(eq(order.buyerId, buyerId))
    .orderBy(asc(order.createdAt), asc(order.id));

  if (orders.length === 0) {
    return [];
  }

  const orderIds = orders.map(({ id }) => id);
  const itemRows = await executor
    .select({
      deliveredAt: orderItem.deliveredAt,
      deliveryReviewDeadlineAt: orderItem.deliveryReviewDeadlineAt,
      escrowAmount: escrowHold.amount,
      escrowHoldId: escrowHold.id,
      escrowHoldStatus: escrowHold.status,
      id: orderItem.id,
      listing: orderItem.listingSnapshot,
      listingId: orderItem.listingId,
      orderId: orderItem.orderId,
      priceAmount: orderItem.priceAmount,
      processingDeadlineAt: orderItem.processingDeadlineAt,
      processingTimeHours: orderItem.processingTimeHours,
      status: orderItem.status,
      warrantyExpiresAt: orderItem.warrantyExpiresAt,
      warrantyPolicy: orderItem.warrantyPolicy,
    })
    .from(orderItem)
    .innerJoin(escrowHold, eq(escrowHold.orderItemId, orderItem.id))
    .where(inArray(orderItem.orderId, orderIds))
    .orderBy(asc(orderItem.createdAt), asc(orderItem.id));

  const itemsByOrder = new Map<string, BuyerOrderView["items"]>();
  for (const item of itemRows) {
    const orderItems = itemsByOrder.get(item.orderId) ?? [];
    orderItems.push(mapOrderItemSummary(item));
    itemsByOrder.set(item.orderId, orderItems);
  }

  return orders.map((item) => ({
    buyerId: item.buyerId,
    checkoutId: item.checkoutId,
    createdAt: item.createdAt.toISOString(),
    currency: item.currency,
    id: item.id,
    items: itemsByOrder.get(item.id) ?? [],
    seller: {
      id: item.sellerId,
      image: item.sellerImage,
      name: item.sellerName,
    },
    sellerId: item.sellerId,
    totalAmount: item.totalAmount,
  }));
};
