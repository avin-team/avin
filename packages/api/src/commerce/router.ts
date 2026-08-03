import { ORPCError } from "@orpc/server";
import { z } from "zod";

import {
  buyerProcedure,
  protectedProcedure,
  sellerProcedure,
} from "../access/procedures";
import {
  addToCart,
  getCart,
  removeFromCart,
  setCartItemSelected,
} from "./cart";
import { checkoutInputSchema, createCheckout } from "./checkout";
import {
  cancelByBuyer,
  cancelBySeller,
  confirmDelivery,
  deliverySubmissionInputSchema,
  disputeInputSchema,
  fulfillmentCommandInputSchema,
  getOrderItemTimeline,
  openDispute,
  sellerCancellationInputSchema,
  startFulfillment,
  submitDelivery,
} from "./fulfillment";
import type { FulfillmentActorRole } from "./fulfillment";
import { getSellerOrders } from "./orders";

const listingIdInput = z.object({ listingId: z.uuid() });
const orderItemIdInput = z.object({ itemId: z.uuid() });

const orderItemCommandInput = orderItemIdInput.extend(
  fulfillmentCommandInputSchema.shape
);
const deliveryInput = orderItemIdInput.extend(
  deliverySubmissionInputSchema.shape
);
const sellerCancellationInput = orderItemIdInput.extend(
  sellerCancellationInputSchema.shape
);
const disputeInput = orderItemIdInput.extend(disputeInputSchema.shape);

const getFulfillmentActorRole = (
  role: string | null | undefined
): FulfillmentActorRole => {
  if (role === "ADMIN" || role === "BUYER" || role === "SELLER") {
    return role;
  }

  throw new ORPCError("FORBIDDEN");
};

export const commerceRouter = {
  cart: {
    add: buyerProcedure
      .input(listingIdInput)
      .handler(({ context, input }) =>
        addToCart(context.db, context.session.user.id, input.listingId)
      ),

    get: buyerProcedure.handler(({ context }) =>
      getCart(context.db, context.session.user.id)
    ),

    remove: buyerProcedure
      .input(listingIdInput)
      .handler(({ context, input }) =>
        removeFromCart(context.db, context.session.user.id, input.listingId)
      ),

    setSelected: buyerProcedure
      .input(listingIdInput.extend({ selected: z.boolean() }))
      .handler(({ context, input }) =>
        setCartItemSelected(
          context.db,
          context.session.user.id,
          input.listingId,
          input.selected
        )
      ),
  },

  checkout: {
    create: buyerProcedure
      .input(checkoutInputSchema)
      .handler(({ context, input }) =>
        createCheckout(context.db, context.session.user.id, input)
      ),
  },

  orders: {
    listMine: sellerProcedure.handler(({ context }) =>
      getSellerOrders(context.db, context.session.user.id)
    ),

    item: {
      cancelByBuyer: buyerProcedure
        .input(orderItemCommandInput)
        .handler(({ context, input }) =>
          cancelByBuyer({
            buyerId: context.session.user.id,
            commandKey: input.commandKey,
            database: context.db,
            itemId: input.itemId,
          })
        ),

      cancelBySeller: sellerProcedure
        .input(sellerCancellationInput)
        .handler(({ context, input }) =>
          cancelBySeller({
            database: context.db,
            input: {
              commandKey: input.commandKey,
              reason: input.reason,
            },
            itemId: input.itemId,
            sellerId: context.session.user.id,
          })
        ),

      confirmDelivery: buyerProcedure
        .input(orderItemCommandInput)
        .handler(({ context, input }) =>
          confirmDelivery({
            buyerId: context.session.user.id,
            commandKey: input.commandKey,
            database: context.db,
            itemId: input.itemId,
          })
        ),

      openDispute: buyerProcedure
        .input(disputeInput)
        .handler(({ context, input }) =>
          openDispute({
            buyerId: context.session.user.id,
            database: context.db,
            input: {
              commandKey: input.commandKey,
              reason: input.reason,
            },
            itemId: input.itemId,
          })
        ),

      startFulfillment: sellerProcedure
        .input(orderItemCommandInput)
        .handler(({ context, input }) =>
          startFulfillment({
            commandKey: input.commandKey,
            database: context.db,
            itemId: input.itemId,
            sellerId: context.session.user.id,
          })
        ),

      submitDelivery: sellerProcedure
        .input(deliveryInput)
        .handler(({ context, input }) =>
          submitDelivery({
            database: context.db,
            input: {
              commandKey: input.commandKey,
              deliveryNote: input.deliveryNote,
              files: input.files,
            },
            itemId: input.itemId,
            sellerId: context.session.user.id,
          })
        ),

      timeline: protectedProcedure
        .input(orderItemIdInput)
        .handler(({ context, input }) =>
          getOrderItemTimeline({
            actorId: context.session.user.id,
            actorRole: getFulfillmentActorRole(context.session.user.role),
            database: context.db,
            itemId: input.itemId,
          })
        ),
    },
  },
};
