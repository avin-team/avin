import { z } from "zod";

import { buyerProcedure, sellerProcedure } from "../access/procedures";
import {
  addToCart,
  getCart,
  removeFromCart,
  setCartItemSelected,
} from "./cart";
import { checkoutInputSchema, createCheckout } from "./checkout";
import { getSellerOrders } from "./orders";

const listingIdInput = z.object({ listingId: z.uuid() });

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
  },
};
