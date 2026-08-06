import { ORPCError } from "@orpc/server";
import { z } from "zod";

import {
  auditedAdminProcedure,
  buyerProcedure,
  protectedProcedure,
  sellerProcedure,
} from "../access/procedures";
import {
  addToCart,
  getCart,
  removeFromCart,
  setCartItemPackage,
  setCartItemSelected,
} from "./cart";
import {
  createAttachment,
  getAttachmentUrl,
  getAfterMessages,
  getNotificationRealtimeToken,
  getRealtimeToken,
  getUnreadCount,
  listConversations,
  listMessages,
  markChatRead,
  redactMessage,
  sendMessage,
} from "./chat";
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
import { getBuyerOrders, getSellerOrders } from "./orders";

const listingIdInput = z.object({ listingId: z.uuid() });
const packageSelectionInput = listingIdInput.extend({ packageId: z.uuid() });
const orderItemIdInput = z.object({ itemId: z.uuid() });

const sendMessageInputSchema = z.object({
  attachmentFileIds: z.array(z.uuid()).max(5).optional(),
  content: z.string().max(2000).optional().nullable(),
  orderId: z.uuid(),
});
const createAttachmentInputSchema = z.object({
  byteSize: z.number().int().nonnegative().nullable().optional(),
  contentType: z.string().trim().min(1).max(255),
  fileName: z.string().trim().min(1).max(255),
  orderId: z.uuid(),
  storageKey: z.string().trim().min(1).max(1024),
});
const attachmentIdInputSchema = z.object({ attachmentId: z.uuid() });

const listMessagesInputSchema = z.object({
  before: z.uuid().optional(),
  limit: z.number().min(1).max(50).optional(),
  orderId: z.uuid(),
});

const getAfterMessagesInputSchema = z.object({
  after: z.uuid(),
  orderId: z.uuid(),
});

const markChatReadInputSchema = z.object({
  messageId: z.uuid(),
  orderId: z.uuid(),
});

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
      .input(listingIdInput.extend({ packageId: z.uuid().optional() }))
      .handler(({ context, input }) =>
        addToCart(
          context.db,
          context.session.user.id,
          input.listingId,
          input.packageId
        )
      ),

    get: buyerProcedure.handler(({ context }) =>
      getCart(context.db, context.session.user.id)
    ),

    remove: buyerProcedure
      .input(listingIdInput)
      .handler(({ context, input }) =>
        removeFromCart(context.db, context.session.user.id, input.listingId)
      ),

    selectPackage: buyerProcedure
      .input(packageSelectionInput)
      .handler(({ context, input }) =>
        setCartItemPackage(
          context.db,
          context.session.user.id,
          input.listingId,
          input.packageId
        )
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

  chat: {
    createAttachment: protectedProcedure
      .input(createAttachmentInputSchema)
      .handler(({ context, input }) =>
        createAttachment({
          database: context.db,
          input,
          user: context.session.user,
        })
      ),

    getAfter: protectedProcedure
      .input(getAfterMessagesInputSchema)
      .handler(({ context, input }) =>
        getAfterMessages({
          database: context.db,
          input,
          userId: context.session.user.id,
          userRole: context.session.user.role,
        })
      ),

    getAttachmentUrl: protectedProcedure
      .input(attachmentIdInputSchema)
      .handler(({ context, input }) =>
        getAttachmentUrl({
          database: context.db,
          input,
          userId: context.session.user.id,
          userRole: context.session.user.role,
        })
      ),

    getNotificationRealtimeToken: protectedProcedure.handler(({ context }) =>
      getNotificationRealtimeToken({
        userId: context.session.user.id,
        userRole: context.session.user.role,
      })
    ),

    getRealtimeToken: protectedProcedure
      .input(z.object({ orderId: z.uuid() }))
      .handler(({ context, input }) =>
        getRealtimeToken({
          database: context.db,
          input,
          userId: context.session.user.id,
          userRole: context.session.user.role,
        })
      ),

    getUnreadCount: protectedProcedure
      .input(z.object({ orderId: z.uuid() }))
      .handler(({ context, input }) =>
        getUnreadCount({
          database: context.db,
          orderId: input.orderId,
          userId: context.session.user.id,
        })
      ),

    listConversations: protectedProcedure.handler(({ context }) =>
      listConversations({
        database: context.db,
        userId: context.session.user.id,
      })
    ),

    listMessages: protectedProcedure
      .input(listMessagesInputSchema)
      .handler(({ context, input }) =>
        listMessages({
          database: context.db,
          input,
          userId: context.session.user.id,
          userRole: context.session.user.role,
        })
      ),

    markRead: protectedProcedure
      .input(markChatReadInputSchema)
      .handler(({ context, input }) =>
        markChatRead({
          database: context.db,
          input,
          userId: context.session.user.id,
        })
      ),

    redactMessage: auditedAdminProcedure("chat.redactMessage")
      .input(z.object({ messageId: z.uuid() }))
      .handler(({ context, input }) =>
        redactMessage({
          adminUserId: context.session.user.id,
          database: context.db,
          input,
        })
      ),

    sendMessage: protectedProcedure
      .input(sendMessageInputSchema)
      .handler(({ context, input }) =>
        sendMessage({
          database: context.db,
          input,
          userId: context.session.user.id,
          userRole: context.session.user.role,
        })
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

    listMine: sellerProcedure.handler(({ context }) =>
      getSellerOrders(context.db, context.session.user.id)
    ),

    listMineAsBuyer: buyerProcedure.handler(({ context }) =>
      getBuyerOrders(context.db, context.session.user.id)
    ),
  },
};
