import {
  escrowHold,
  order,
  orderCustomInput,
  orderItem,
} from "@avin/db/schema/commerce";
import type { OrderItemStatus } from "@avin/db/schema/commerce";
import { asc, eq, inArray } from "drizzle-orm";

import type { CommerceExecutor } from "./cart";

export interface SellerOrderView {
  buyerId: string;
  checkoutId: string;
  createdAt: string;
  currency: string;
  id: string;
  items: {
    customInputs: {
      fieldKey: string;
      fieldType: string;
      value: unknown;
    }[];
    escrowHold: {
      amount: number;
      id: string;
      status: "CANCELLED" | "HELD" | "REFUNDED" | "RELEASED";
    };
    id: string;
    listingId: string;
    priceAmount: number;
    processingDeadlineAt: string;
    processingTimeHours: number;
    status: OrderItemStatus;
  }[];
  sellerId: string;
  totalAmount: number;
}

export const getSellerOrders = async (
  executor: CommerceExecutor,
  sellerId: string
): Promise<SellerOrderView[]> => {
  const orders = await executor
    .select({
      buyerId: order.buyerId,
      checkoutId: order.checkoutId,
      createdAt: order.createdAt,
      currency: order.currency,
      id: order.id,
      sellerId: order.sellerId,
      totalAmount: order.totalAmount,
    })
    .from(order)
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
      id: orderItem.id,
      listingId: orderItem.listingId,
      orderId: orderItem.orderId,
      priceAmount: orderItem.priceAmount,
      processingDeadlineAt: orderItem.processingDeadlineAt,
      processingTimeHours: orderItem.processingTimeHours,
      status: orderItem.status,
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
      escrowHold: {
        amount: item.escrowAmount,
        id: item.escrowHoldId,
        status: item.escrowHoldStatus,
      },
      id: item.id,
      listingId: item.listingId,
      priceAmount: item.priceAmount,
      processingDeadlineAt: item.processingDeadlineAt.toISOString(),
      processingTimeHours: item.processingTimeHours,
      status: item.status,
    });
    itemsByOrder.set(item.orderId, orderItems);
  }

  return orders.map((item) => ({
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
