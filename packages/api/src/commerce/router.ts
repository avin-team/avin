import { adminRequiresTwoFactor } from "@avin/auth/permissions";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import {
  adminProcedure,
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
  discardAttachment,
  getAttachmentUrl,
  getAfterMessages,
  getChatNotificationSummary,
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
  checkoutAttachmentInputSchema,
  createCheckoutAttachment,
  discardCheckoutAttachment,
} from "./checkout-attachments";
import {
  cancelDispute,
  disputeCancelInputSchema,
  disputeGetInputSchema,
  disputeListInputSchema,
  disputeResolveInputSchema,
  getDisputeEvidenceUrl,
  getDisputeEvidenceUrlForUser,
  getDispute,
  listDisputes,
  resolveDispute,
  sellerDisputeEvidenceInputSchema,
  submitSellerEvidence,
} from "./disputes";
import {
  cancelByBuyer,
  cancelBySeller,
  confirmDelivery,
  createDeliveryAttachment,
  deliverySubmissionInputSchema,
  deliveryAttachmentInputSchema,
  discardDeliveryAttachment,
  disputeInputSchema,
  fulfillmentCommandInputSchema,
  getOrderFileUrl,
  getOrderItemTimeline,
  openDispute,
  sellerCancellationInputSchema,
  startFulfillment,
  submitDelivery,
} from "./fulfillment";
import type { FulfillmentActorRole } from "./fulfillment";
import { getBuyerOrders, getSellerOrders } from "./orders";
import { reviewRouter } from "./review";

const listingIdInput = z.object({ listingId: z.uuid() });
const packageSelectionInput = listingIdInput.extend({ packageId: z.uuid() });
const orderItemIdInput = z.object({ itemId: z.uuid() });

const sendMessageInputSchema = z.object({
  attachmentFileIds: z.array(z.uuid()).max(5).optional(),
  content: z.string().max(2000).optional().nullable(),
  orderId: z.uuid(),
});
const createAttachmentInputSchema = z.object({
  byteSize: z.number().int().nonnegative(),
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

    discardAttachment: protectedProcedure
      .input(attachmentIdInputSchema)
      .handler(({ context, input }) =>
        discardAttachment({
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

    getNotificationSummary: protectedProcedure.handler(({ context }) =>
      getChatNotificationSummary({
        database: context.db,
        userId: context.session.user.id,
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
    attachments: {
      create: buyerProcedure
        .input(checkoutAttachmentInputSchema)
        .handler(({ context, input }) =>
          createCheckoutAttachment({
            buyerId: context.session.user.id,
            database: context.db,
            input,
            storage: context.storage,
          })
        ),

      discard: buyerProcedure
        .input(z.object({ attachmentId: z.uuid() }))
        .handler(({ context, input }) =>
          discardCheckoutAttachment({
            attachmentId: input.attachmentId,
            buyerId: context.session.user.id,
            database: context.db,
            storage: context.storage,
          })
        ),
    },

    create: buyerProcedure
      .input(checkoutInputSchema)
      .handler(({ context, input }) =>
        createCheckout(context.db, context.session.user.id, input)
      ),
  },

  disputes: {
    adminEvidenceUrl: adminProcedure
      .input(z.object({ disputeId: z.uuid(), evidenceId: z.uuid() }))
      .handler(({ context, input }) =>
        getDisputeEvidenceUrl({
          database: context.db,
          disputeId: input.disputeId,
          evidenceId: input.evidenceId,
        })
      ),

    adminGet: adminProcedure
      .input(disputeGetInputSchema)
      .handler(({ context, input }) =>
        getDispute({
          adminUserId: context.session.user.id,
          database: context.db,
          disputeId: input.disputeId,
        })
      ),

    adminList: adminProcedure
      .input(disputeListInputSchema)
      .handler(({ context, input }) =>
        listDisputes({ database: context.db, status: input?.status })
      ),

    adminResolve: adminProcedure
      .input(disputeResolveInputSchema)
      .handler(({ context, input }) =>
        resolveDispute({
          adminMessage: input.adminMessage,
          adminUserId: context.session.user.id,
          commandKey: input.commandKey,
          database: context.db,
          disputeId: input.disputeId,
          note: input.note,
          outcome: input.outcome,
        })
      ),

    cancel: buyerProcedure
      .input(disputeCancelInputSchema)
      .handler(({ context, input }) =>
        cancelDispute({
          buyerId: context.session.user.id,
          commandKey: input.commandKey,
          database: context.db,
          disputeId: input.disputeId,
          reason: input.reason,
        })
      ),

    getEvidenceUrl: protectedProcedure
      .input(z.object({ disputeId: z.uuid(), evidenceId: z.uuid() }))
      .handler(({ context, input }) => {
        if (
          context.session.user.role === "ADMIN" &&
          adminRequiresTwoFactor(context.session.user)
        ) {
          throw new ORPCError("FORBIDDEN", {
            message: "Two-factor authentication is required for Admin access.",
          });
        }
        return getDisputeEvidenceUrlForUser({
          database: context.db,
          disputeId: input.disputeId,
          evidenceId: input.evidenceId,
          userId: context.session.user.id,
          userRole: getFulfillmentActorRole(context.session.user.role),
        });
      }),

    submitSellerEvidence: sellerProcedure
      .input(
        z.object({
          disputeId: z.uuid(),
          ...sellerDisputeEvidenceInputSchema.shape,
        })
      )
      .handler(({ context, input }) =>
        submitSellerEvidence({
          commandKey: input.commandKey,
          database: context.db,
          disputeId: input.disputeId,
          evidence: input.evidence,
          sellerId: context.session.user.id,
        })
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

      createAttachment: sellerProcedure
        .input(deliveryAttachmentInputSchema)
        .handler(({ context, input }) =>
          createDeliveryAttachment({
            database: context.db,
            input,
            sellerId: context.session.user.id,
            storage: context.storage,
          })
        ),

      discardAttachment: sellerProcedure
        .input(attachmentIdInputSchema)
        .handler(({ context, input }) =>
          discardDeliveryAttachment({
            attachmentId: input.attachmentId,
            database: context.db,
            sellerId: context.session.user.id,
            storage: context.storage,
          })
        ),

      getFileUrl: protectedProcedure
        .input(z.object({ fileId: z.uuid(), itemId: z.uuid() }))
        .handler(({ context, input }) => {
          if (
            context.session.user.role === "ADMIN" &&
            adminRequiresTwoFactor(context.session.user)
          ) {
            throw new ORPCError("FORBIDDEN", {
              message:
                "Two-factor authentication is required for Admin access.",
            });
          }
          return getOrderFileUrl({
            actorId: context.session.user.id,
            actorRole: getFulfillmentActorRole(context.session.user.role),
            database: context.db,
            fileId: input.fileId,
            itemId: input.itemId,
          });
        }),

      openDispute: buyerProcedure
        .input(disputeInput)
        .handler(({ context, input }) =>
          openDispute({
            buyerId: context.session.user.id,
            database: context.db,
            input: {
              commandKey: input.commandKey,
              evidence: input.evidence,
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
              attachmentIds: input.attachmentIds,
              commandKey: input.commandKey,
              deliveryNote: input.deliveryNote,
            },
            itemId: input.itemId,
            sellerId: context.session.user.id,
          })
        ),

      timeline: protectedProcedure
        .input(orderItemIdInput)
        .handler(({ context, input }) => {
          if (
            context.session.user.role === "ADMIN" &&
            adminRequiresTwoFactor(context.session.user)
          ) {
            throw new ORPCError("FORBIDDEN", {
              message:
                "Two-factor authentication is required for Admin access.",
            });
          }
          return getOrderItemTimeline({
            actorId: context.session.user.id,
            actorRole: getFulfillmentActorRole(context.session.user.role),
            database: context.db,
            itemId: input.itemId,
          });
        }),
    },

    listMine: sellerProcedure.handler(({ context }) =>
      getSellerOrders(context.db, context.session.user.id)
    ),

    listMineAsBuyer: buyerProcedure.handler(({ context }) =>
      getBuyerOrders(context.db, context.session.user.id)
    ),
  },

  review: reviewRouter,
};
