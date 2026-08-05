/* eslint-disable func-style */

import { generateUuidV7 } from "@avin/db";
import type { db } from "@avin/db";
import { auditLog, user } from "@avin/db/schema/auth";
import {
  chatReadCursor,
  dispute,
  order,
  orderFile,
  orderItem,
  orderMessage,
} from "@avin/db/schema/commerce";
import { ORPCError } from "@orpc/server";
import { and, asc, count, desc, eq, gt, inArray, lt } from "drizzle-orm";

export interface SendMessageInput {
  attachmentFileIds?: string[];
  content?: string | null;
  orderId: string;
}

export interface SendMessageOptions {
  database: typeof db;
  input: SendMessageInput;
  userId: string;
  userRole?: string | null;
}

export interface ListMessagesInput {
  before?: string;
  limit?: number;
  orderId: string;
}

export interface ListMessagesOptions {
  database: typeof db;
  input: ListMessagesInput;
  userId: string;
  userRole?: string | null;
}

export interface GetAfterMessagesInput {
  after: string;
  orderId: string;
}

export interface GetAfterMessagesOptions {
  database: typeof db;
  input: GetAfterMessagesInput;
  userId: string;
  userRole?: string | null;
}

export interface MarkReadInput {
  messageId: string;
  orderId: string;
}

export interface MarkReadOptions {
  database: typeof db;
  input: MarkReadInput;
  userId: string;
}

export interface RedactMessageInput {
  messageId: string;
}

export interface RedactMessageOptions {
  adminUserId: string;
  database: typeof db;
  input: RedactMessageInput;
}

export interface GetRealtimeTokenInput {
  orderId: string;
}

export interface GetRealtimeTokenOptions {
  database: typeof db;
  input: GetRealtimeTokenInput;
  userId: string;
  userRole?: string | null;
}

async function assertCanReadChat({
  database,
  orderRecord,
  userId,
  userRole,
}: {
  database: typeof db;
  orderRecord: { buyerId: string; sellerId: string };
  userId: string;
  userRole?: string | null;
}): Promise<{ isAdmin: boolean }> {
  const isAdmin = userRole === "ADMIN";
  if (userId === orderRecord.sellerId) {
    const sellerUser = await database.query.user.findFirst({
      where: eq(user.id, userId),
    });
    if (sellerUser?.banned) {
      throw new ORPCError("FORBIDDEN", {
        message: "Banned seller cannot access order chat",
      });
    }
  } else if (userId !== orderRecord.buyerId && !isAdmin) {
    throw new ORPCError("FORBIDDEN", { message: "Not authorized" });
  }

  return { isAdmin };
}

async function resolveSenderRoleAndType({
  buyerId,
  database,
  orderId,
  sellerId,
  userId,
  userRole,
}: {
  buyerId: string;
  database: typeof db;
  orderId: string;
  sellerId: string;
  userId: string;
  userRole?: string | null;
}): Promise<{
  messageType: "text" | "system" | "admin_mediation";
  senderRole: "buyer" | "seller" | "admin";
}> {
  if (userId === buyerId) {
    return { messageType: "text", senderRole: "buyer" };
  }

  if (userId === sellerId) {
    const sellerUser = await database.query.user.findFirst({
      where: eq(user.id, userId),
    });
    if (sellerUser?.banned) {
      throw new ORPCError("FORBIDDEN", {
        message: "Banned seller cannot access order chat",
      });
    }
    return { messageType: "text", senderRole: "seller" };
  }

  if (userRole === "ADMIN") {
    const items = await database.query.orderItem.findMany({
      where: eq(orderItem.orderId, orderId),
    });

    const itemIds = items.map((item: { id: string }) => item.id);
    const activeDispute = itemIds.length
      ? await database.query.dispute.findFirst({
          where: and(
            inArray(dispute.orderItemId, itemIds),
            eq(dispute.status, "OPEN")
          ),
        })
      : null;

    if (!activeDispute) {
      throw new ORPCError("FORBIDDEN", {
        message: "Admin can only send messages during an open dispute",
      });
    }

    return { messageType: "admin_mediation", senderRole: "admin" };
  }

  throw new ORPCError("FORBIDDEN", { message: "Not authorized" });
}

export async function sendMessage({
  database,
  input,
  userId,
  userRole,
}: SendMessageOptions) {
  const content = input.content?.trim() || null;
  const attachmentFileIds = input.attachmentFileIds ?? [];

  if (!content && attachmentFileIds.length === 0) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Message must contain either text content or attachments",
    });
  }

  if (content && content.length > 2000) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Message content exceeds maximum length of 2000 characters",
    });
  }

  if (attachmentFileIds.length > 5) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Maximum 5 attachments allowed per message",
    });
  }

  const existingOrder = await database.query.order.findFirst({
    where: eq(order.id, input.orderId),
  });

  if (!existingOrder) {
    throw new ORPCError("NOT_FOUND", { message: "Order not found" });
  }

  const { senderRole, messageType } = await resolveSenderRoleAndType({
    buyerId: existingOrder.buyerId,
    database,
    orderId: input.orderId,
    sellerId: existingOrder.sellerId,
    userId,
    userRole,
  });

  if (attachmentFileIds.length > 0) {
    const files = await database.query.orderFile.findMany({
      where: and(
        inArray(orderFile.id, attachmentFileIds),
        eq(orderFile.orderId, input.orderId),
        eq(orderFile.uploadedByUserId, userId)
      ),
    });

    if (files.length !== attachmentFileIds.length) {
      throw new ORPCError("BAD_REQUEST", {
        message: "One or more attachment files are invalid or unauthorized",
      });
    }
  }

  const messageId = generateUuidV7();

  const [inserted] = await database
    .insert(orderMessage)
    .values({
      content,
      id: messageId,
      orderId: input.orderId,
      senderId: userId,
      senderRole,
      type: messageType,
    })
    .returning();

  if (!inserted) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Failed to persist message",
    });
  }

  if (attachmentFileIds.length > 0) {
    await database
      .update(orderFile)
      .set({ orderMessageId: messageId })
      .where(inArray(orderFile.id, attachmentFileIds));
  }

  const attachments = attachmentFileIds.length
    ? await database.query.orderFile.findMany({
        where: eq(orderFile.orderMessageId, messageId),
      })
    : [];

  return {
    ...inserted,
    attachments,
  };
}

export async function listMessages({
  database,
  input,
  userId,
  userRole,
}: ListMessagesOptions) {
  const existingOrder = await database.query.order.findFirst({
    where: eq(order.id, input.orderId),
  });

  if (!existingOrder) {
    throw new ORPCError("NOT_FOUND", { message: "Order not found" });
  }

  const { isAdmin } = await assertCanReadChat({
    database,
    orderRecord: existingOrder,
    userId,
    userRole,
  });

  if (
    isAdmin &&
    userId !== existingOrder.buyerId &&
    userId !== existingOrder.sellerId
  ) {
    await database.insert(auditLog).values({
      action: "chat.readMessages",
      actorUserId: userId,
      outcome: "SUCCESS",
      targetId: input.orderId,
      targetType: "order_chat",
    });
  }

  const limit = Math.min(Math.max(input.limit ?? 30, 1), 50);

  const whereConditions = [eq(orderMessage.orderId, input.orderId)];
  if (input.before) {
    whereConditions.push(lt(orderMessage.id, input.before));
  }

  const messages = await database.query.orderMessage.findMany({
    limit,
    orderBy: [desc(orderMessage.id)],
    where: and(...whereConditions),
    with: {
      attachments: true,
    },
  });

  const processedMessages = messages.map((msg) => {
    if (msg.redactedAt && !isAdmin) {
      return {
        ...msg,
        attachments: [],
        content: "[Tin nhắn đã bị ẩn bởi quản trị viên]",
        redactedByUserId: null,
      };
    }
    return msg;
  });

  const nextCursor =
    processedMessages.length === limit
      ? (processedMessages.at(-1)?.id ?? null)
      : null;

  return {
    messages: processedMessages,
    nextCursor,
  };
}

export async function getAfterMessages({
  database,
  input,
  userId,
  userRole,
}: GetAfterMessagesOptions) {
  const existingOrder = await database.query.order.findFirst({
    where: eq(order.id, input.orderId),
  });

  if (!existingOrder) {
    throw new ORPCError("NOT_FOUND", { message: "Order not found" });
  }

  const { isAdmin } = await assertCanReadChat({
    database,
    orderRecord: existingOrder,
    userId,
    userRole,
  });

  if (
    isAdmin &&
    userId !== existingOrder.buyerId &&
    userId !== existingOrder.sellerId
  ) {
    await database.insert(auditLog).values({
      action: "chat.readMessages",
      actorUserId: userId,
      outcome: "SUCCESS",
      targetId: input.orderId,
      targetType: "order_chat",
    });
  }

  const messages = await database.query.orderMessage.findMany({
    orderBy: [asc(orderMessage.id)],
    where: and(
      eq(orderMessage.orderId, input.orderId),
      gt(orderMessage.id, input.after)
    ),
    with: {
      attachments: true,
    },
  });

  return messages.map((msg) => {
    if (msg.redactedAt && !isAdmin) {
      return {
        ...msg,
        attachments: [],
        content: "[Tin nhắn đã bị ẩn bởi quản trị viên]",
        redactedByUserId: null,
      };
    }
    return msg;
  });
}

export async function markChatRead({
  database,
  input,
  userId,
}: MarkReadOptions) {
  const existingOrder = await database.query.order.findFirst({
    where: eq(order.id, input.orderId),
  });

  if (!existingOrder) {
    throw new ORPCError("NOT_FOUND", { message: "Order not found" });
  }

  await assertCanReadChat({
    database,
    orderRecord: existingOrder,
    userId,
  });

  await database
    .insert(chatReadCursor)
    .values({
      lastReadMessageId: input.messageId,
      orderId: input.orderId,
      updatedAt: new Date(),
      userId,
    })
    .onConflictDoUpdate({
      set: {
        lastReadMessageId: input.messageId,
        updatedAt: new Date(),
      },
      target: [chatReadCursor.orderId, chatReadCursor.userId],
    });

  return { success: true };
}

export async function getUnreadCount({
  database,
  orderId,
  userId,
}: {
  database: typeof db;
  orderId: string;
  userId: string;
}) {
  const existingOrder = await database.query.order.findFirst({
    where: eq(order.id, orderId),
  });

  if (!existingOrder) {
    throw new ORPCError("NOT_FOUND", { message: "Order not found" });
  }

  await assertCanReadChat({
    database,
    orderRecord: existingOrder,
    userId,
  });

  const cursorRecord = await database.query.chatReadCursor.findFirst({
    where: and(
      eq(chatReadCursor.orderId, orderId),
      eq(chatReadCursor.userId, userId)
    ),
  });

  const lastReadId = cursorRecord?.lastReadMessageId;

  const whereConditions = [eq(orderMessage.orderId, orderId)];
  if (lastReadId) {
    whereConditions.push(gt(orderMessage.id, lastReadId));
  }

  const [res] = await database
    .select({ value: count() })
    .from(orderMessage)
    .where(and(...whereConditions));

  return { unreadCount: Number(res?.value ?? 0) };
}

export async function redactMessage({
  adminUserId,
  database,
  input,
}: RedactMessageOptions) {
  const existingMessage = await database.query.orderMessage.findFirst({
    where: eq(orderMessage.id, input.messageId),
  });

  if (!existingMessage) {
    throw new ORPCError("NOT_FOUND", { message: "Message not found" });
  }

  const [updated] = await database
    .update(orderMessage)
    .set({
      redactedAt: new Date(),
      redactedByUserId: adminUserId,
    })
    .where(eq(orderMessage.id, input.messageId))
    .returning();

  return updated;
}

export async function getRealtimeToken({
  database,
  input,
  userId,
  userRole,
}: GetRealtimeTokenOptions) {
  const existingOrder = await database.query.order.findFirst({
    where: eq(order.id, input.orderId),
  });

  if (!existingOrder) {
    throw new ORPCError("NOT_FOUND", { message: "Order not found" });
  }

  await assertCanReadChat({
    database,
    orderRecord: existingOrder,
    userId,
    userRole,
  });

  return {
    channel: `order:${input.orderId}`,
    expiresInSeconds: 600,
  };
}
