/* eslint-disable no-await-in-loop, react-doctor/async-await-in-loop */

import { ORDER_FILES_BUCKET } from "@avin/api/storage";
import { db, generateUuidV7 } from "@avin/db";
import { auditLog, user } from "@avin/db/schema/auth";
import { listing, subCategory } from "@avin/db/schema/catalog";
import {
  dispute,
  disputeEvidence,
  escrowHold,
  order,
  orderFile,
  orderItem,
  orderItemLifecycleEvent,
  orderMessage,
} from "@avin/db/schema/commerce";
import type {
  DisputeStatus,
  ListingSnapshot,
  OrderItemStatus,
  ServicePackageSnapshot,
  WarrantyPolicySnapshot,
} from "@avin/db/schema/commerce";
import { sellerProfile } from "@avin/db/schema/seller";
import { ORPCError } from "@orpc/server";
import {
  aliasedTable,
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  lte,
} from "drizzle-orm";
import { z } from "zod";

import {
  createNotificationEvent,
  listNotificationRecipientsByRole,
} from "../notifications/notification";
import {
  DISPUTE_EVIDENCE_MAX_COUNT,
  isDisputeEvidenceKey,
} from "../runtime/storage";
import type { CommerceExecutor } from "./cart";
import { ORDER_MESSAGE_MAX_LENGTH } from "./chat";
import {
  DISPUTE_ADMIN_SLA_HOURS,
  addBusinessHours,
  sellerDisputeEvidenceListSchema,
} from "./dispute-contracts";
import type { DisputeEvidenceInput } from "./dispute-contracts";
import {
  cancelDisputeDecision,
  resolveDisputeDecision,
} from "./dispute-workflow";
import { refundEscrow, releaseEscrow } from "./fulfillment";
import type { EscrowResolutionContext } from "./fulfillment";
import { incrementCompletedOrderCounts } from "./review";

const REASON_MAX_LENGTH = 5000;
const COMMAND_KEY_MAX_LENGTH = 128;
const MAX_ADMIN_NOTIFICATION_RECIPIENTS = 100;

export const sellerDisputeEvidenceInputSchema = z.object({
  commandKey: z.string().trim().min(1).max(COMMAND_KEY_MAX_LENGTH),
  evidence: sellerDisputeEvidenceListSchema,
});

export const disputeListInputSchema = z.object({
  status: z
    .enum([
      "ALL",
      "CANCELLED",
      "OPEN",
      "RESOLVED_REFUNDED",
      "RESOLVED_RELEASED",
    ])
    .optional(),
});

export const disputeGetInputSchema = z.object({ disputeId: z.uuid() });

export const disputeResolveInputSchema = z.object({
  adminMessage: z.string().trim().max(ORDER_MESSAGE_MAX_LENGTH).optional(),
  commandKey: z.string().trim().min(1).max(COMMAND_KEY_MAX_LENGTH),
  disputeId: z.uuid(),
  note: z.string().trim().min(1).max(REASON_MAX_LENGTH),
  outcome: z.enum(["RESOLVED_REFUNDED", "RESOLVED_RELEASED"]),
});

export const disputeCancelInputSchema = z.object({
  commandKey: z.string().trim().min(1).max(COMMAND_KEY_MAX_LENGTH),
  disputeId: z.uuid(),
  reason: z.string().trim().min(1).max(REASON_MAX_LENGTH),
});

interface DisputeRow {
  buyerEmail: string;
  buyerId: string;
  buyerName: string;
  categoryName: string;
  commissionRatePercent: string;
  createdAt: Date;
  adminDecisionDeadlineAt: Date | null;
  disputeId: string;
  disputeStatus: DisputeStatus;
  escrowAmount: number;
  escrowHoldId: string;
  escrowHoldStatus: "CANCELLED" | "HELD" | "REFUNDED" | "RELEASED";
  itemId: string;
  listingId: string;
  listingSnapshot: ListingSnapshot;
  orderId: string;
  orderItemPriceAmount: number;
  orderItemQuantity: number;
  orderItemStatus: OrderItemStatus;
  previousOrderItemStatus: OrderItemStatus;
  reason: string;
  resolutionNote: string | null;
  resolvedAt: Date | null;
  resolvedByUserId: string | null;
  responseDeadlineAt: Date;
  servicePackageSnapshot: ServicePackageSnapshot | null;
  sellerEmail: string;
  sellerId: string;
  sellerName: string;
  sellerStorefrontName: string | null;
  warrantyPolicy: WarrantyPolicySnapshot;
}

export interface DisputeEvidenceView {
  byteSize: number;
  contentType: string;
  description: string;
  fileName: string;
  id: string;
  storageKey: string;
  submittedLate: boolean;
  submittedAt: string;
  submitterRole: "BUYER" | "SELLER";
  fileUrl?: string;
}

export interface DisputeChatAttachmentView {
  byteSize: number;
  contentType: string;
  fileName: string;
  id: string;
}

export interface DisputeChatMessageView {
  content: string;
  id: string;
  senderName: string;
  senderRole: "BUYER" | "SELLER" | "ADMIN";
  sentAt: string;
  attachments: DisputeChatAttachmentView[];
}

export interface DisputeView {
  adminDecisionDeadlineAt?: string;
  buyerEmail: string;
  buyerId: string;
  buyerName: string;
  chatMessages: DisputeChatMessageView[];
  createdAt: string;
  evidenceList: DisputeEvidenceView[];
  id: string;
  itemSnapshot: {
    buyerInputs: Record<string, string>;
    categoryName: string;
    id: string;
    listingTitle: string;
    orderId: string;
    quantity: number;
    servicePackageDescription: string | null;
    servicePackageName: string | null;
    servicePackageScope: string | null;
    totalAmountVnd: number;
    unitPriceVnd: number;
    warrantyDurationHours: number;
    warrantyPolicyTerms: string;
  };
  orderItemId: string;
  reason: string;
  responseDeadlineAt: string;
  resolutionNote?: string;
  resolvedAt?: string;
  sellerEmail: string;
  sellerId: string;
  sellerStorefrontName: string;
  status: DisputeStatus;
}

export interface DisputeMutationResult {
  changed: boolean;
  disputeId: string;
  escrowAmount: number;
  escrowHoldStatus: "CANCELLED" | "HELD" | "REFUNDED" | "RELEASED";
  eventId: string | null;
  orderItemId: string;
  orderItemStatus: OrderItemStatus;
  status: DisputeStatus;
  transactionId: string | null;
}

const buyerUser = aliasedTable(user, "dispute_buyer");
const sellerUser = aliasedTable(user, "dispute_seller");
const messageSenderUser = aliasedTable(user, "dispute_message_sender");

const selectDisputeRows = async (
  executor: CommerceExecutor,
  whereClause?: ReturnType<typeof eq>,
  lock = false
): Promise<DisputeRow[]> => {
  const query = executor
    .select({
      adminDecisionDeadlineAt: dispute.adminDecisionDeadlineAt,
      buyerEmail: buyerUser.email,
      buyerId: dispute.buyerId,
      buyerName: buyerUser.name,
      categoryName: subCategory.name,
      commissionRatePercent: orderItem.commissionRatePercent,
      createdAt: dispute.createdAt,
      disputeId: dispute.id,
      disputeStatus: dispute.status,
      escrowAmount: escrowHold.amount,
      escrowHoldId: escrowHold.id,
      escrowHoldStatus: escrowHold.status,
      itemId: orderItem.id,
      listingId: orderItem.listingId,
      listingSnapshot: orderItem.listingSnapshot,
      orderId: order.id,
      orderItemPriceAmount: orderItem.priceAmount,
      orderItemQuantity: orderItem.quantity,
      orderItemStatus: orderItem.status,
      previousOrderItemStatus: dispute.previousOrderItemStatus,
      reason: dispute.reason,
      resolutionNote: dispute.resolutionNote,
      resolvedAt: dispute.resolvedAt,
      resolvedByUserId: dispute.resolvedByUserId,
      responseDeadlineAt: dispute.responseDeadlineAt,
      sellerEmail: sellerUser.email,
      sellerId: order.sellerId,
      sellerName: sellerUser.name,
      sellerStorefrontName: sellerProfile.storefrontName,
      servicePackageSnapshot: orderItem.servicePackageSnapshot,
      warrantyPolicy: orderItem.warrantyPolicy,
    })
    .from(dispute)
    .innerJoin(orderItem, eq(orderItem.id, dispute.orderItemId))
    .innerJoin(order, eq(order.id, orderItem.orderId))
    .innerJoin(escrowHold, eq(escrowHold.orderItemId, orderItem.id))
    .innerJoin(buyerUser, eq(buyerUser.id, dispute.buyerId))
    .innerJoin(sellerUser, eq(sellerUser.id, order.sellerId))
    .innerJoin(listing, eq(listing.id, orderItem.listingId))
    .innerJoin(subCategory, eq(subCategory.id, listing.categoryId))
    .leftJoin(sellerProfile, eq(sellerProfile.userId, order.sellerId))
    .where(whereClause)
    .orderBy(desc(dispute.openedAt), desc(dispute.id));

  const rows = lock ? await query.for("update", { of: dispute }) : await query;

  return rows;
};

const getEvidenceForDisputes = async (
  executor: CommerceExecutor,
  disputeIds: string[]
): Promise<Map<string, DisputeEvidenceView[]>> => {
  if (disputeIds.length === 0) {
    return new Map();
  }

  const rows = await executor
    .select({
      byteSize: disputeEvidence.byteSize,
      contentType: disputeEvidence.contentType,
      description: disputeEvidence.description,
      disputeId: disputeEvidence.disputeId,
      fileName: disputeEvidence.fileName,
      id: disputeEvidence.id,
      storageKey: disputeEvidence.storageKey,
      submittedAt: disputeEvidence.submittedAt,
      submittedLate: disputeEvidence.submittedLate,
      submitterRole: disputeEvidence.submitterRole,
    })
    .from(disputeEvidence)
    .where(inArray(disputeEvidence.disputeId, disputeIds))
    .orderBy(asc(disputeEvidence.submittedAt), asc(disputeEvidence.id));

  const evidenceByDispute = new Map<string, DisputeEvidenceView[]>();
  for (const row of rows) {
    const current = evidenceByDispute.get(row.disputeId) ?? [];
    current.push({
      byteSize: row.byteSize ?? 0,
      contentType: row.contentType,
      description: row.description,
      fileName: row.fileName,
      id: row.id,
      storageKey: row.storageKey,
      submittedAt: row.submittedAt.toISOString(),
      submittedLate: row.submittedLate,
      submitterRole: row.submitterRole,
    });
    evidenceByDispute.set(row.disputeId, current);
  }
  return evidenceByDispute;
};

const warrantyDurationHours = (policy: WarrantyPolicySnapshot): number => {
  if ("kind" in policy) {
    return policy.kind === "TIMED" ? policy.durationHours : 0;
  }
  return policy.durationHours;
};

const warrantyTerms = (policy: WarrantyPolicySnapshot): string => {
  if ("kind" in policy) {
    return policy.kind === "TIMED"
      ? `Bảo hành trong ${policy.durationHours} giờ.`
      : "Không có bảo hành";
  }
  return policy.terms;
};

const toDisputeView = (
  row: DisputeRow,
  evidence: DisputeEvidenceView[],
  chatMessages: DisputeChatMessageView[]
): DisputeView => ({
  adminDecisionDeadlineAt: row.adminDecisionDeadlineAt?.toISOString(),
  buyerEmail: row.buyerEmail,
  buyerId: row.buyerId,
  buyerName: row.buyerName,
  chatMessages,
  createdAt: row.createdAt.toISOString(),
  evidenceList: evidence,
  id: row.disputeId,
  itemSnapshot: {
    buyerInputs: {},
    categoryName: row.categoryName,
    id: row.itemId,
    listingTitle: row.listingSnapshot.title,
    orderId: row.orderId,
    quantity: row.orderItemQuantity,
    servicePackageDescription: row.servicePackageSnapshot?.description ?? null,
    servicePackageName: row.servicePackageSnapshot?.name ?? null,
    servicePackageScope: row.servicePackageSnapshot?.scope ?? null,
    totalAmountVnd: row.escrowAmount,
    unitPriceVnd: row.orderItemPriceAmount,
    warrantyDurationHours: warrantyDurationHours(row.warrantyPolicy),
    warrantyPolicyTerms: warrantyTerms(row.warrantyPolicy),
  },
  orderItemId: row.itemId,
  reason: row.reason,
  resolutionNote: row.resolutionNote ?? undefined,
  resolvedAt: row.resolvedAt?.toISOString(),
  responseDeadlineAt: row.responseDeadlineAt.toISOString(),
  sellerEmail: row.sellerEmail,
  sellerId: row.sellerId,
  sellerStorefrontName: row.sellerStorefrontName ?? row.sellerName,
  status: row.disputeStatus,
});

const toDisputeChatSenderRole = (
  role: string
): DisputeChatMessageView["senderRole"] => {
  switch (role) {
    case "buyer": {
      return "BUYER";
    }
    case "seller": {
      return "SELLER";
    }
    case "admin": {
      return "ADMIN";
    }
    default: {
      throw new Error(`Unsupported order message sender role: ${role}`);
    }
  }
};

export const getChatMessagesForOrders = async (
  executor: CommerceExecutor,
  orderIds: string[]
): Promise<Map<string, DisputeChatMessageView[]>> => {
  if (orderIds.length === 0) {
    return new Map();
  }

  const rows = await executor
    .select({
      attachmentByteSize: orderFile.byteSize,
      attachmentContentType: orderFile.contentType,
      attachmentFileName: orderFile.fileName,
      attachmentId: orderFile.id,
      content: orderMessage.content,
      id: orderMessage.id,
      orderId: orderMessage.orderId,
      senderName: messageSenderUser.name,
      senderRole: orderMessage.senderRole,
      sentAt: orderMessage.createdAt,
    })
    .from(orderMessage)
    .innerJoin(
      messageSenderUser,
      eq(messageSenderUser.id, orderMessage.senderId)
    )
    .leftJoin(orderFile, eq(orderFile.orderMessageId, orderMessage.id))
    .where(inArray(orderMessage.orderId, orderIds))
    .orderBy(
      asc(orderMessage.createdAt),
      asc(orderMessage.id),
      asc(orderFile.createdAt),
      asc(orderFile.id)
    );

  const messagesByOrder = new Map<string, DisputeChatMessageView[]>();
  const messagesById = new Map<string, DisputeChatMessageView>();
  for (const row of rows) {
    const current = messagesByOrder.get(row.orderId) ?? [];
    const attachment = row.attachmentId
      ? {
          byteSize: row.attachmentByteSize ?? 0,
          contentType: row.attachmentContentType ?? "application/octet-stream",
          fileName: row.attachmentFileName ?? "Tệp đính kèm",
          id: row.attachmentId,
        }
      : null;
    const message = messagesById.get(row.id);
    if (message) {
      if (attachment) {
        message.attachments.push(attachment);
      }
      continue;
    }

    const newMessage: DisputeChatMessageView = {
      attachments: attachment ? [attachment] : [],
      content: row.content ?? "[Tin nhắn không có nội dung]",
      id: row.id,
      senderName: row.senderName,
      senderRole: toDisputeChatSenderRole(row.senderRole),
      sentAt: row.sentAt.toISOString(),
    };
    current.push(newMessage);
    messagesById.set(row.id, newMessage);
    messagesByOrder.set(row.orderId, current);
  }
  return messagesByOrder;
};

export const listDisputes = async ({
  database = db,
  status,
}: {
  database?: typeof db;
  status?: z.infer<typeof disputeListInputSchema>["status"];
}): Promise<DisputeView[]> => {
  const rows = await selectDisputeRows(
    database,
    status && status !== "ALL" ? eq(dispute.status, status) : undefined
  );
  return rows.map((row) => toDisputeView(row, [], []));
};

export const getDispute = async ({
  adminUserId,
  database = db,
  disputeId,
}: {
  adminUserId?: string;
  database?: typeof db;
  disputeId: string;
}): Promise<DisputeView> => {
  const [row] = await selectDisputeRows(database, eq(dispute.id, disputeId));
  if (!row) {
    throw new ORPCError("NOT_FOUND", {
      message: "Không tìm thấy tranh chấp.",
    });
  }
  if (adminUserId) {
    await database.insert(auditLog).values({
      action: "chat.readMessages",
      actorUserId: adminUserId,
      metadata: { disputeId },
      outcome: "SUCCESS",
      targetId: row.orderId,
      targetType: "order_chat",
    });
  }
  const [evidenceByDispute, chatByOrder] = await Promise.all([
    getEvidenceForDisputes(database, [disputeId]),
    getChatMessagesForOrders(database, [row.orderId]),
  ]);
  return toDisputeView(
    row,
    evidenceByDispute.get(disputeId) ?? [],
    chatByOrder.get(row.orderId) ?? []
  );
};

const createSignedDisputeEvidenceUrl = async (
  storageKey: string
): Promise<{ url: string }> => {
  const { env } = await import("@avin/env/server");
  const objectPath = storageKey.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(
    new URL(
      `/storage/v1/object/sign/${ORDER_FILES_BUCKET}/${objectPath}`,
      env.SUPABASE_URL
    ),
    {
      body: JSON.stringify({ expiresIn: 600 }),
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
        "Content-Type": "application/json",
        apikey: env.SUPABASE_SECRET_KEY,
      },
      method: "POST",
    }
  );
  if (!response.ok) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Không thể tạo đường dẫn tải tệp bằng chứng.",
    });
  }

  const result = (await response.json()) as { signedURL?: string };
  if (!result.signedURL) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Không thể tạo đường dẫn tải tệp bằng chứng.",
    });
  }
  const signedPath = result.signedURL.startsWith("/storage/v1/")
    ? result.signedURL
    : `/storage/v1${result.signedURL}`;
  return { url: new URL(signedPath, env.SUPABASE_URL).toString() };
};

export const getDisputeEvidenceUrl = async ({
  database = db,
  disputeId,
  evidenceId,
}: {
  database?: typeof db;
  disputeId: string;
  evidenceId: string;
}): Promise<{ url: string }> => {
  const [evidence] = await database
    .select({ storageKey: disputeEvidence.storageKey })
    .from(disputeEvidence)
    .where(
      and(
        eq(disputeEvidence.disputeId, disputeId),
        eq(disputeEvidence.id, evidenceId)
      )
    )
    .limit(1);
  if (!evidence) {
    throw new ORPCError("NOT_FOUND", {
      message: "Không tìm thấy tệp bằng chứng.",
    });
  }
  return createSignedDisputeEvidenceUrl(evidence.storageKey);
};

export const getDisputeEvidenceUrlForUser = async ({
  database = db,
  disputeId,
  evidenceId,
  userId,
  userRole,
}: {
  database?: typeof db;
  disputeId: string;
  evidenceId: string;
  userId: string;
  userRole: "ADMIN" | "BUYER" | "SELLER";
}): Promise<{ url: string }> => {
  const [evidence] = await database
    .select({
      buyerId: dispute.buyerId,
      sellerId: order.sellerId,
      storageKey: disputeEvidence.storageKey,
    })
    .from(disputeEvidence)
    .innerJoin(dispute, eq(dispute.id, disputeEvidence.disputeId))
    .innerJoin(orderItem, eq(orderItem.id, dispute.orderItemId))
    .innerJoin(order, eq(order.id, orderItem.orderId))
    .where(
      and(
        eq(disputeEvidence.disputeId, disputeId),
        eq(disputeEvidence.id, evidenceId)
      )
    )
    .limit(1);
  if (!evidence) {
    throw new ORPCError("NOT_FOUND", {
      message: "Không tìm thấy tệp bằng chứng.",
    });
  }
  if (
    userRole !== "ADMIN" &&
    evidence.buyerId !== userId &&
    evidence.sellerId !== userId
  ) {
    throw new ORPCError("FORBIDDEN", {
      message: "Bạn không có quyền xem tệp bằng chứng này.",
    });
  }
  return createSignedDisputeEvidenceUrl(evidence.storageKey);
};

const insertDisputeNotifications = async (
  executor: CommerceExecutor,
  row: Pick<DisputeRow, "buyerId" | "disputeId" | "orderId" | "sellerId">,
  eventId: string,
  eventType: "dispute.resolved",
  body: string,
  title: string,
  now: Date
): Promise<void> => {
  const adminRecipients = await listNotificationRecipientsByRole(executor, {
    limit: MAX_ADMIN_NOTIFICATION_RECIPIENTS,
    role: "ADMIN",
    targetPath: "/disputes",
  });
  await createNotificationEvent(executor, {
    body,
    context: { disputeId: row.disputeId, orderId: row.orderId },
    email: {
      htmlBody: `<p>${body}</p>`,
      recipientUserIds: [row.buyerId, row.sellerId],
      subject: "Avin: Dispute đã được xử lý",
      textBody: body,
    },
    eventType,
    now,
    recipients: [
      { targetPath: `/orders/${row.orderId}`, userId: row.buyerId },
      { targetPath: `/orders/${row.orderId}`, userId: row.sellerId },
      ...adminRecipients,
    ],
    sourceId: eventId,
    sourceType: "DISPUTE",
    title,
  });
};

export const submitSellerEvidence = ({
  commandKey,
  database = db,
  disputeId,
  evidence,
  now = new Date(),
  sellerId,
}: {
  commandKey: string;
  database?: typeof db;
  disputeId: string;
  evidence: DisputeEvidenceInput[];
  now?: Date;
  sellerId: string;
}): Promise<DisputeEvidenceView[]> =>
  database.transaction(async (transaction) => {
    const [row] = await transaction
      .select({
        buyerId: dispute.buyerId,
        disputeStatus: dispute.status,
        id: dispute.id,
        orderItemId: dispute.orderItemId,
        responseDeadlineAt: dispute.responseDeadlineAt,
        sellerId: order.sellerId,
        status: orderItem.status,
      })
      .from(dispute)
      .innerJoin(orderItem, eq(orderItem.id, dispute.orderItemId))
      .innerJoin(order, eq(order.id, orderItem.orderId))
      .where(eq(dispute.id, disputeId))
      .for("update")
      .limit(1);

    if (!row) {
      throw new ORPCError("NOT_FOUND", {
        message: "Không tìm thấy tranh chấp.",
      });
    }
    if (row.sellerId !== sellerId) {
      throw new ORPCError("FORBIDDEN", {
        message: "Bạn không có quyền gửi bằng chứng cho tranh chấp này.",
      });
    }
    const eventCommandKey = `SUBMIT_DISPUTE_EVIDENCE:${commandKey.trim()}`;
    const [existingEvent] = await transaction
      .select({ id: orderItemLifecycleEvent.id })
      .from(orderItemLifecycleEvent)
      .where(
        and(
          eq(orderItemLifecycleEvent.orderItemId, row.orderItemId),
          eq(orderItemLifecycleEvent.commandKey, eventCommandKey)
        )
      )
      .limit(1);
    if (existingEvent) {
      const evidenceByDispute = await getEvidenceForDisputes(transaction, [
        disputeId,
      ]);
      return evidenceByDispute.get(disputeId) ?? [];
    }
    if (row.status !== "DISPUTED") {
      throw new ORPCError("CONFLICT", {
        message: "OrderItem không còn ở trạng thái Disputed.",
      });
    }
    if (row.disputeStatus !== "OPEN") {
      throw new ORPCError("CONFLICT", {
        message: "Tranh chấp đã kết thúc và không nhận thêm bằng chứng.",
      });
    }
    if (evidence.length === 0) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Seller cần gửi ít nhất một tệp bằng chứng.",
      });
    }
    if (
      evidence.some(
        (file) =>
          !isDisputeEvidenceKey(file.storageKey, row.orderItemId, sellerId)
      )
    ) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Evidence must be uploaded through the evidence route.",
      });
    }

    const [existingCount] = await transaction
      .select({ count: count() })
      .from(disputeEvidence)
      .where(eq(disputeEvidence.disputeId, disputeId));
    if (
      (existingCount?.count ?? 0) + evidence.length >
      DISPUTE_EVIDENCE_MAX_COUNT
    ) {
      throw new ORPCError("BAD_REQUEST", {
        message: `Mỗi tranh chấp tối đa ${DISPUTE_EVIDENCE_MAX_COUNT} tệp bằng chứng.`,
      });
    }

    const [inserted] = await Promise.all([
      transaction
        .insert(disputeEvidence)
        .values(
          evidence.map((file) => ({
            byteSize: file.byteSize,
            contentType: file.contentType,
            description: file.description.trim(),
            disputeId,
            fileName: file.fileName.trim(),
            storageKey: file.storageKey.trim(),
            submittedAt: now,
            submittedByUserId: sellerId,
            submittedLate: now > row.responseDeadlineAt,
            submitterRole: "SELLER" as const,
          }))
        )
        .returning(),
      transaction.insert(orderItemLifecycleEvent).values({
        actorType: "SELLER",
        actorUserId: sellerId,
        artifactId: disputeId,
        artifactType: "DISPUTE_EVIDENCE",
        commandKey: eventCommandKey,
        createdAt: now,
        effectiveAt: now,
        newStatus: "DISPUTED",
        oldStatus: "DISPUTED",
        orderItemId: row.orderItemId,
        reason: "Seller submitted dispute evidence",
      }),
    ]);
    await transaction
      .update(dispute)
      .set({
        adminDecisionDeadlineAt: addBusinessHours(
          now > row.responseDeadlineAt ? row.responseDeadlineAt : now,
          DISPUTE_ADMIN_SLA_HOURS
        ),
        updatedAt: now,
      })
      .where(
        and(
          eq(dispute.id, disputeId),
          eq(dispute.status, "OPEN"),
          isNull(dispute.adminDecisionDeadlineAt)
        )
      );

    return inserted.map((file) => ({
      byteSize: file.byteSize ?? 0,
      contentType: file.contentType,
      description: file.description,
      fileName: file.fileName,
      id: file.id,
      storageKey: file.storageKey,
      submittedAt: file.submittedAt.toISOString(),
      submittedLate: file.submittedLate,
      submitterRole: file.submitterRole,
    }));
  });

export const notifyDisputeResponseDeadlines = async ({
  database = db,
  limit = MAX_ADMIN_NOTIFICATION_RECIPIENTS,
  now = new Date(),
}: {
  database?: typeof db;
  limit?: number;
  now?: Date;
}): Promise<string[]> => {
  const dueDisputes = await database
    .select({
      adminDecisionDeadlineAt: dispute.adminDecisionDeadlineAt,
      buyerId: dispute.buyerId,
      disputeId: dispute.id,
      itemId: dispute.orderItemId,
      orderId: order.id,
      responseDeadlineAt: dispute.responseDeadlineAt,
      sellerId: order.sellerId,
    })
    .from(dispute)
    .innerJoin(orderItem, eq(orderItem.id, dispute.orderItemId))
    .innerJoin(order, eq(order.id, orderItem.orderId))
    .where(
      and(eq(dispute.status, "OPEN"), lte(dispute.responseDeadlineAt, now))
    )
    .orderBy(asc(dispute.responseDeadlineAt), asc(dispute.id))
    .limit(limit);

  const notifiedDisputeIds: string[] = [];
  for (const dueDispute of dueDisputes) {
    const didNotify = await database.transaction(async (transaction) => {
      const [lockedDispute] = await transaction
        .select({
          adminDecisionDeadlineAt: dispute.adminDecisionDeadlineAt,
          responseDeadlineAt: dispute.responseDeadlineAt,
          status: dispute.status,
        })
        .from(dispute)
        .where(eq(dispute.id, dueDispute.disputeId))
        .for("update")
        .limit(1);
      if (
        !lockedDispute ||
        lockedDispute.status !== "OPEN" ||
        now < lockedDispute.responseDeadlineAt
      ) {
        return false;
      }

      const adminDecisionDeadlineAt =
        lockedDispute.adminDecisionDeadlineAt ??
        addBusinessHours(
          lockedDispute.responseDeadlineAt,
          DISPUTE_ADMIN_SLA_HOURS
        );
      if (!lockedDispute.adminDecisionDeadlineAt) {
        await transaction
          .update(dispute)
          .set({ adminDecisionDeadlineAt, updatedAt: now })
          .where(eq(dispute.id, dueDispute.disputeId));
      }

      const [adminRecipients, existingEvents] = await Promise.all([
        listNotificationRecipientsByRole(transaction, {
          limit: MAX_ADMIN_NOTIFICATION_RECIPIENTS,
          role: "ADMIN",
          targetPath: "/disputes",
        }),
        transaction
          .select({
            commandKey: orderItemLifecycleEvent.commandKey,
            id: orderItemLifecycleEvent.id,
          })
          .from(orderItemLifecycleEvent)
          .where(eq(orderItemLifecycleEvent.orderItemId, dueDispute.itemId)),
      ]);
      const existingCommandKeys = new Set(
        existingEvents.map((event) => event.commandKey)
      );
      let changed = false;

      const createDeadlineEvent = async ({
        body,
        commandKey,
        reason,
        title,
      }: {
        body: string;
        commandKey: string;
        reason: string;
        title: string;
      }): Promise<void> => {
        if (existingCommandKeys.has(commandKey)) {
          return;
        }
        const [event] = await transaction
          .insert(orderItemLifecycleEvent)
          .values({
            actorType: "SYSTEM",
            actorUserId: null,
            artifactId: null,
            artifactType: null,
            commandKey,
            createdAt: now,
            effectiveAt: now,
            newStatus: "DISPUTED",
            oldStatus: "DISPUTED",
            orderItemId: dueDispute.itemId,
            reason,
          })
          .returning({ id: orderItemLifecycleEvent.id });
        if (!event) {
          throw new Error("Dispute deadline event was not created");
        }
        await createNotificationEvent(transaction, {
          body,
          context: {
            disputeId: dueDispute.disputeId,
            orderId: dueDispute.orderId,
          },
          email: {
            htmlBody: `<p>${body}</p>`,
            recipientUserIds: [dueDispute.buyerId, dueDispute.sellerId],
            subject: "Avin: Dispute có mốc thời hạn mới",
            textBody: body,
          },
          eventType: "dispute.deadline",
          now,
          recipients: [
            {
              targetPath: `/orders/${dueDispute.orderId}`,
              userId: dueDispute.buyerId,
            },
            {
              targetPath: `/orders/${dueDispute.orderId}`,
              userId: dueDispute.sellerId,
            },
            ...adminRecipients,
          ],
          sourceId: event.id,
          sourceType: "DISPUTE",
          title,
        });
        changed = true;
      };

      await createDeadlineEvent({
        body: "Đã hết 48 giờ để Seller phản hồi. Admin có thể ra quyết định.",
        commandKey: `DISPUTE_RESPONSE_DEADLINE:${dueDispute.disputeId}`,
        reason: "Seller response deadline expired",
        title: "Hết hạn phản hồi Dispute",
      });
      if (now >= adminDecisionDeadlineAt) {
        await createDeadlineEvent({
          body: "Đã quá SLA 48 giờ làm việc để Admin xử lý Dispute.",
          commandKey: `DISPUTE_ADMIN_DEADLINE:${dueDispute.disputeId}`,
          reason: "Admin decision deadline expired",
          title: "Dispute quá hạn xử lý Admin",
        });
      }
      return changed;
    });
    if (didNotify) {
      notifiedDisputeIds.push(dueDispute.disputeId);
    }
  }
  return notifiedDisputeIds;
};

const getMutationContext = async (
  executor: CommerceExecutor,
  disputeId: string
): Promise<DisputeRow | undefined> => {
  const [row] = await selectDisputeRows(
    executor,
    eq(dispute.id, disputeId),
    true
  );
  return row;
};

const toEscrowResolutionContext = (
  row: DisputeRow
): EscrowResolutionContext => ({
  buyerId: row.buyerId,
  commissionRatePercent: row.commissionRatePercent,
  escrowAmount: row.escrowAmount,
  escrowHoldId: row.escrowHoldId,
  escrowHoldStatus: row.escrowHoldStatus,
  id: row.itemId,
  orderId: row.orderId,
  sellerId: row.sellerId,
});

export const resolveDispute = ({
  adminMessage,
  adminUserId,
  commandKey,
  database = db,
  disputeId,
  note,
  now = new Date(),
  outcome,
}: {
  adminMessage?: string;
  adminUserId: string;
  commandKey: string;
  database?: typeof db;
  disputeId: string;
  note: string;
  now?: Date;
  outcome: "RESOLVED_REFUNDED" | "RESOLVED_RELEASED";
}): Promise<DisputeMutationResult> =>
  database.transaction(async (transaction) => {
    const row = await getMutationContext(transaction, disputeId);
    if (!row) {
      throw new ORPCError("NOT_FOUND", {
        message: "Không tìm thấy tranh chấp.",
      });
    }

    const eventCommandKey = `RESOLVE_DISPUTE:${commandKey.trim()}`;
    const [existingEvent] = await transaction
      .select({
        artifactId: orderItemLifecycleEvent.artifactId,
        artifactType: orderItemLifecycleEvent.artifactType,
        id: orderItemLifecycleEvent.id,
        newStatus: orderItemLifecycleEvent.newStatus,
      })
      .from(orderItemLifecycleEvent)
      .where(
        and(
          eq(orderItemLifecycleEvent.orderItemId, row.itemId),
          eq(orderItemLifecycleEvent.commandKey, eventCommandKey)
        )
      )
      .limit(1);
    if (existingEvent) {
      const existingOutcome =
        existingEvent.artifactType === "REFUND_TRANSACTION"
          ? "RESOLVED_REFUNDED"
          : "RESOLVED_RELEASED";
      if (existingOutcome !== outcome) {
        throw new ORPCError("CONFLICT", {
          message: "Command key đã được dùng cho một quyết định khác.",
        });
      }
      return {
        changed: false,
        disputeId,
        escrowAmount: row.escrowAmount,
        escrowHoldStatus:
          outcome === "RESOLVED_REFUNDED" ? "REFUNDED" : "RELEASED",
        eventId: existingEvent.id,
        orderItemId: row.itemId,
        orderItemStatus: existingEvent.newStatus,
        status: outcome,
        transactionId: existingEvent.artifactId,
      };
    }

    let decision: ReturnType<typeof resolveDisputeDecision>;
    try {
      decision = resolveDisputeDecision({
        disputeStatus: row.disputeStatus,
        note,
        now,
        orderItemStatus: row.orderItemStatus,
        outcome,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new ORPCError("CONFLICT", { message: error.message });
      }
      throw error;
    }
    const transactionId =
      decision.escrowHoldStatus === "REFUNDED"
        ? await refundEscrow(transaction, toEscrowResolutionContext(row), now)
        : await releaseEscrow(transaction, toEscrowResolutionContext(row), now);

    if (adminMessage?.trim()) {
      await transaction.insert(orderMessage).values({
        content: adminMessage.trim(),
        createdAt: now,
        id: generateUuidV7(),
        orderId: row.orderId,
        senderId: adminUserId,
        senderRole: "admin",
        type: "admin_mediation",
      });
    }

    await transaction.insert(auditLog).values({
      action: "commerce.dispute.resolve",
      actorUserId: adminUserId,
      createdAt: now,
      metadata: {
        commandKey: commandKey.trim(),
        escrowAmount: row.escrowAmount,
        escrowHoldStatus: decision.escrowHoldStatus,
        note: decision.note,
        orderItemStatus: decision.orderItemStatus,
        outcome,
        previousDisputeStatus: row.disputeStatus,
        previousOrderItemStatus: row.orderItemStatus,
        transactionId,
      },
      outcome: "SUCCESS",
      targetId: disputeId,
      targetType: "DISPUTE",
    });

    const [updatedDispute] = await transaction
      .update(dispute)
      .set({
        resolutionNote: decision.note,
        resolvedAt: decision.resolvedAt,
        resolvedByUserId: adminUserId,
        status: decision.disputeStatus,
        updatedAt: now,
      })
      .where(and(eq(dispute.id, disputeId), eq(dispute.status, "OPEN")))
      .returning({ id: dispute.id });
    if (!updatedDispute) {
      throw new ORPCError("CONFLICT", {
        message: "Tranh chấp vừa được xử lý bởi Admin khác.",
      });
    }

    const [updatedItem] = await transaction
      .update(orderItem)
      .set({ status: decision.orderItemStatus, updatedAt: now })
      .where(
        and(eq(orderItem.id, row.itemId), eq(orderItem.status, "DISPUTED"))
      )
      .returning({ id: orderItem.id });
    if (!updatedItem) {
      throw new ORPCError("CONFLICT", {
        message: "OrderItem vừa được xử lý bởi request khác.",
      });
    }

    if (decision.orderItemStatus === "CLOSED") {
      await incrementCompletedOrderCounts(transaction, {
        listingId: row.listingId,
        sellerId: row.sellerId,
      });
    }

    const [event] = await transaction
      .insert(orderItemLifecycleEvent)
      .values({
        actorType: "ADMIN",
        actorUserId: adminUserId,
        artifactId: transactionId,
        artifactType:
          decision.escrowHoldStatus === "REFUNDED"
            ? "REFUND_TRANSACTION"
            : "ESCROW_RELEASE",
        commandKey: eventCommandKey,
        createdAt: now,
        effectiveAt: now,
        newStatus: decision.orderItemStatus,
        oldStatus: "DISPUTED",
        orderItemId: row.itemId,
        reason: decision.note,
      })
      .returning({ id: orderItemLifecycleEvent.id });
    if (!event) {
      throw new Error("Dispute lifecycle event was not created");
    }

    await insertDisputeNotifications(
      transaction,
      row,
      event.id,
      "dispute.resolved",
      decision.escrowHoldStatus === "REFUNDED"
        ? "Admin đã hoàn toàn bộ escrow cho Buyer."
        : "Admin đã giải ngân toàn bộ escrow cho Seller.",
      "Dispute đã được xử lý",
      now
    );

    return {
      changed: true,
      disputeId,
      escrowAmount: row.escrowAmount,
      escrowHoldStatus: decision.escrowHoldStatus,
      eventId: event.id,
      orderItemId: row.itemId,
      orderItemStatus: decision.orderItemStatus,
      status: decision.disputeStatus,
      transactionId,
    };
  });

export const cancelDispute = ({
  buyerId,
  commandKey,
  database = db,
  disputeId,
  now = new Date(),
  reason,
}: {
  buyerId: string;
  commandKey: string;
  database?: typeof db;
  disputeId: string;
  now?: Date;
  reason: string;
}): Promise<DisputeMutationResult> =>
  database.transaction(async (transaction) => {
    const row = await getMutationContext(transaction, disputeId);
    if (!row) {
      throw new ORPCError("NOT_FOUND", {
        message: "Không tìm thấy tranh chấp.",
      });
    }
    if (row.buyerId !== buyerId) {
      throw new ORPCError("FORBIDDEN", {
        message: "Chỉ Buyer của OrderItem mới được hủy tranh chấp.",
      });
    }

    const eventCommandKey = `CANCEL_DISPUTE:${commandKey.trim()}`;
    const [existingEvent] = await transaction
      .select({
        id: orderItemLifecycleEvent.id,
        newStatus: orderItemLifecycleEvent.newStatus,
      })
      .from(orderItemLifecycleEvent)
      .where(
        and(
          eq(orderItemLifecycleEvent.orderItemId, row.itemId),
          eq(orderItemLifecycleEvent.commandKey, eventCommandKey)
        )
      )
      .limit(1);
    if (existingEvent) {
      return {
        changed: false,
        disputeId,
        escrowAmount: row.escrowAmount,
        escrowHoldStatus: row.escrowHoldStatus,
        eventId: existingEvent.id,
        orderItemId: row.itemId,
        orderItemStatus: existingEvent.newStatus,
        status: "CANCELLED",
        transactionId: null,
      };
    }

    let decision: ReturnType<typeof cancelDisputeDecision>;
    try {
      decision = cancelDisputeDecision({
        disputeStatus: row.disputeStatus,
        now,
        orderItemStatus: row.orderItemStatus,
        previousOrderItemStatus: row.previousOrderItemStatus,
        reason,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new ORPCError("CONFLICT", { message: error.message });
      }
      throw error;
    }
    if (row.escrowHoldStatus !== "HELD") {
      throw new ORPCError("CONFLICT", {
        message: "EscrowHold không còn ở trạng thái HELD.",
      });
    }

    const [updatedDispute] = await transaction
      .update(dispute)
      .set({
        resolutionNote: decision.reason,
        resolvedAt: decision.cancelledAt,
        resolvedByUserId: buyerId,
        status: "CANCELLED",
        updatedAt: now,
      })
      .where(and(eq(dispute.id, disputeId), eq(dispute.status, "OPEN")))
      .returning({ id: dispute.id });
    if (!updatedDispute) {
      throw new ORPCError("CONFLICT", {
        message: "Tranh chấp vừa được xử lý bởi request khác.",
      });
    }
    const [updatedItem] = await transaction
      .update(orderItem)
      .set({ status: decision.orderItemStatus, updatedAt: now })
      .where(
        and(eq(orderItem.id, row.itemId), eq(orderItem.status, "DISPUTED"))
      )
      .returning({ id: orderItem.id });
    if (!updatedItem) {
      throw new ORPCError("CONFLICT", {
        message: "OrderItem vừa được xử lý bởi request khác.",
      });
    }

    const [event] = await transaction
      .insert(orderItemLifecycleEvent)
      .values({
        actorType: "BUYER",
        actorUserId: buyerId,
        artifactId: null,
        artifactType: null,
        commandKey: eventCommandKey,
        createdAt: now,
        effectiveAt: now,
        newStatus: decision.orderItemStatus,
        oldStatus: "DISPUTED",
        orderItemId: row.itemId,
        reason: decision.reason,
      })
      .returning({ id: orderItemLifecycleEvent.id });
    if (!event) {
      throw new Error("Dispute cancellation event was not created");
    }

    await insertDisputeNotifications(
      transaction,
      row,
      event.id,
      "dispute.resolved",
      "Buyer đã hủy tranh chấp. Escrow quay lại quy trình bình thường.",
      "Dispute đã được hủy",
      now
    );

    return {
      changed: true,
      disputeId,
      escrowAmount: row.escrowAmount,
      escrowHoldStatus: row.escrowHoldStatus,
      eventId: event.id,
      orderItemId: row.itemId,
      orderItemStatus: decision.orderItemStatus,
      status: "CANCELLED",
      transactionId: null,
    };
  });
