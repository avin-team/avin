import type { AccountRole } from "@avin/auth/permissions";
import { db } from "@avin/db";
import { user } from "@avin/db/schema/auth";
import {
  deliverySubmission,
  dispute,
  disputeEvidence,
  escrowHold,
  order,
  orderFile,
  orderItem,
  orderItemLifecycleEvent,
} from "@avin/db/schema/commerce";
import type {
  DisputeStatus,
  OrderItemStatus,
  ServicePackageSnapshot,
  WarrantyPolicySnapshot,
} from "@avin/db/schema/commerce";
import { sellerEnforcement } from "@avin/db/schema/seller-enforcement";
import { userWallet } from "@avin/db/schema/wallet";
import { ORPCError } from "@orpc/server";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  like,
  notExists,
  or,
} from "drizzle-orm";
import { z } from "zod";

import {
  createNotificationEvent,
  listNotificationRecipientsByRole,
} from "../notifications/notification";
import {
  COMMERCE_IMAGE_CONTENT_TYPES,
  COMMERCE_IMAGE_MAX_BYTES,
  COMMERCE_IMAGE_MAX_COUNT,
  isDisputeEvidenceKey,
  isDeliveryAttachmentKey,
} from "../runtime/storage";
import type { ManagedObjectStore } from "../runtime/storage";
import { isSellerEnforcementActive } from "../seller-enforcement/policy";
import { recordBalancedLedgerTransaction } from "../wallet/ledger";
import {
  ensureSellerWalletAccounts,
  ensureWalletAccounts,
} from "../wallet/service";
import type { CommerceExecutor } from "./cart";
import { calculateEscrowReleaseAmounts } from "./commission";
import {
  disputeEvidenceListSchema,
  getDisputeResponseDeadline,
} from "./dispute-contracts";
import type { DisputeEvidenceInput } from "./dispute-contracts";
import { decideOrderItemTransition } from "./fulfillment-state";
import type {
  OrderItemTransitionCommand,
  OrderItemTransitionResult,
} from "./fulfillment-state";
import {
  deleteOrderFileObject,
  createSignedOrderFileUrl,
} from "./private-storage";
import { incrementCompletedOrderCounts } from "./review";

export type FulfillmentActorType = "BUYER" | "SELLER" | "SYSTEM";
export type FulfillmentActorRole = Extract<
  AccountRole,
  "ADMIN" | "BUYER" | "SELLER"
>;

const COMMAND_KEY_MAX_LENGTH = 128;
const CONTENT_TYPE_MAX_LENGTH = 255;
const DELIVERY_NOTE_MAX_LENGTH = 1000;
const FILE_NAME_MAX_LENGTH = 255;
const MAX_ADMIN_NOTIFICATION_RECIPIENTS = 100;
const MAX_BANNED_SELLER_CANCELLATIONS = 100;
const MAX_DUE_DELIVERY_REVIEWS = 100;
const MAX_DUE_WARRANTY_EXPIRIES = 100;
const REASON_MAX_LENGTH = 5000;
const STORAGE_KEY_MAX_LENGTH = 512;
const TRANSACTION_REFERENCE_SUFFIX_LENGTH = 12;

const commandKeySchema = z.string().trim().min(1).max(COMMAND_KEY_MAX_LENGTH);

const throwNotFound = (): never => {
  throw new ORPCError("NOT_FOUND", {
    message: "OrderItem không tồn tại.",
  });
};

const throwForbidden = (): never => {
  throw new ORPCError("FORBIDDEN", {
    message: "Bạn không có quyền thao tác OrderItem này.",
  });
};

const throwConflict = (message: string): never => {
  throw new ORPCError("CONFLICT", { message });
};

export const fulfillmentCommandInputSchema = z.object({
  commandKey: commandKeySchema,
});

export const sellerCancellationInputSchema =
  fulfillmentCommandInputSchema.extend({
    reason: z.string().trim().min(1).max(REASON_MAX_LENGTH),
  });

export const disputeInputSchema = fulfillmentCommandInputSchema.extend({
  evidence: disputeEvidenceListSchema,
  reason: z.string().trim().min(1).max(REASON_MAX_LENGTH),
});

export const deliverySubmissionInputSchema =
  fulfillmentCommandInputSchema.extend({
    attachmentIds: z.array(z.uuid()).max(COMMERCE_IMAGE_MAX_COUNT).default([]),
    deliveryNote: z.string().trim().max(DELIVERY_NOTE_MAX_LENGTH).default(""),
  });

export type DeliverySubmissionInput = z.infer<
  typeof deliverySubmissionInputSchema
>;

export const deliveryAttachmentInputSchema = z.object({
  byteSize: z.number().int().positive().max(COMMERCE_IMAGE_MAX_BYTES),
  contentType: z.string().trim().min(1).max(CONTENT_TYPE_MAX_LENGTH),
  fileName: z.string().trim().min(1).max(FILE_NAME_MAX_LENGTH),
  itemId: z.uuid(),
  storageKey: z.string().trim().min(1).max(STORAGE_KEY_MAX_LENGTH),
});

export type DeliveryAttachmentInput = z.infer<
  typeof deliveryAttachmentInputSchema
>;

type FulfillmentExecutor = CommerceExecutor;

export interface OrderItemContext {
  buyerDescription: string | null;
  buyerId: string;
  commissionRatePercent: string;
  deliveredAt: Date | null;
  deliveryReviewDeadlineAt: Date | null;
  escrowAmount: number;
  escrowHoldId: string;
  escrowHoldStatus: "CANCELLED" | "HELD" | "REFUNDED" | "RELEASED";
  id: string;
  listingId: string;
  orderId: string;
  processingDeadlineAt: Date;
  servicePackage: ServicePackageSnapshot | null;
  sellerEnforcementExpiresAt: Date | null;
  sellerEnforcementState: "BANNED" | "CLEAR" | "SUSPENDED" | null;
  sellerId: string;
  status: OrderItemStatus;
  warrantyExpiresAt: Date | null;
  warrantyPolicy: WarrantyPolicySnapshot;
  warrantyStartedAt: Date | null;
}

export type EscrowResolutionContext = Pick<
  OrderItemContext,
  | "buyerId"
  | "commissionRatePercent"
  | "escrowAmount"
  | "escrowHoldId"
  | "escrowHoldStatus"
  | "id"
  | "orderId"
  | "sellerId"
>;

interface ExistingLifecycleEvent {
  artifactId: string | null;
  artifactType: string | null;
  effectiveAt: Date;
  id: string;
  newStatus: OrderItemStatus;
}

export interface OrderItemCommandResult {
  artifactId: string | null;
  artifactType: string | null;
  changed: boolean;
  effectiveAt: string;
  eventId: string;
  orderItemId: string;
  status: OrderItemStatus;
}

export interface OrderItemTimelineView {
  current: {
    deliveredAt: string | null;
    deliveryReviewDeadlineAt: string | null;
    orderId: string;
    servicePackage?: ServicePackageSnapshot | null;
    processingDeadlineAt: string;
    status: OrderItemStatus;
    warrantyExpiresAt: string | null;
    warrantyPolicy: WarrantyPolicySnapshot;
    warrantyStartedAt: string | null;
  };
  buyerInput?: {
    description: string | null;
    files: {
      byteSize: number | null;
      contentType: string;
      fileName: string;
      id: string;
      storageKey: string;
    }[];
  } | null;
  deliverySubmission: {
    deliveredAt: string;
    deliveryNote: string | null;
    files: {
      byteSize: number | null;
      contentType: string;
      fileName: string;
      id: string;
      storageKey: string;
    }[];
    id: string;
    sellerId: string;
  } | null;
  dispute: {
    buyerId: string;
    evidence: {
      byteSize: number;
      contentType: string;
      description: string;
      fileName: string;
      id: string;
      storageKey: string;
      submittedLate: boolean;
      submittedAt: string;
      submitterRole: "BUYER" | "SELLER";
    }[];
    id: string;
    openedAt: string;
    reason: string;
    responseDeadlineAt: string;
    status: DisputeStatus;
  } | null;
  events: {
    actorType: "ADMIN" | "BUYER" | "SELLER" | "SYSTEM";
    actorUserId: string | null;
    artifactId: string | null;
    artifactType: string | null;
    effectiveAt: string;
    id: string;
    newStatus: OrderItemStatus;
    oldStatus: OrderItemStatus | null;
    reason: string | null;
  }[];
  orderItemId: string;
}

const asIso = (value: Date | null | undefined): string | null =>
  value?.toISOString() ?? null;

const normalizeCommandKey = (commandKey: string): string =>
  commandKeySchema.parse(commandKey);

const commandKeyFor = (commandType: string, commandKey: string): string =>
  `${commandType}:${normalizeCommandKey(commandKey)}`;

const getItemContext = async (
  executor: FulfillmentExecutor,
  itemId: string,
  lock: boolean
): Promise<OrderItemContext | undefined> => {
  const query = executor
    .select({
      buyerDescription: orderItem.buyerDescription,
      buyerId: order.buyerId,
      commissionRatePercent: orderItem.commissionRatePercent,
      deliveredAt: orderItem.deliveredAt,
      deliveryReviewDeadlineAt: orderItem.deliveryReviewDeadlineAt,
      escrowAmount: escrowHold.amount,
      escrowHoldId: escrowHold.id,
      escrowHoldStatus: escrowHold.status,
      id: orderItem.id,
      listingId: orderItem.listingId,
      orderId: order.id,
      processingDeadlineAt: orderItem.processingDeadlineAt,
      sellerEnforcementExpiresAt: sellerEnforcement.expiresAt,
      sellerEnforcementState: sellerEnforcement.state,
      sellerId: order.sellerId,
      servicePackage: orderItem.servicePackageSnapshot,
      status: orderItem.status,
      warrantyExpiresAt: orderItem.warrantyExpiresAt,
      warrantyPolicy: orderItem.warrantyPolicy,
      warrantyStartedAt: orderItem.warrantyStartedAt,
    })
    .from(orderItem)
    .innerJoin(order, eq(order.id, orderItem.orderId))
    .innerJoin(escrowHold, eq(escrowHold.orderItemId, orderItem.id))
    .leftJoin(sellerEnforcement, eq(sellerEnforcement.sellerId, order.sellerId))
    .where(eq(orderItem.id, itemId));

  const [item] = lock
    ? await query.for("update", { of: orderItem }).limit(1)
    : await query.limit(1);
  return item;
};

const assertCommerceImageContentType = (contentType: string): void => {
  if (
    !COMMERCE_IMAGE_CONTENT_TYPES.includes(
      contentType as (typeof COMMERCE_IMAGE_CONTENT_TYPES)[number]
    )
  ) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Ảnh chỉ hỗ trợ JPEG, PNG hoặc WebP.",
    });
  }
};

export const createDeliveryAttachment = async ({
  database = db,
  input,
  sellerId,
  storage,
}: {
  database?: typeof db;
  input: DeliveryAttachmentInput;
  sellerId: string;
  storage?: ManagedObjectStore;
}) => {
  const parsedInput = deliveryAttachmentInputSchema.parse(input);
  assertCommerceImageContentType(parsedInput.contentType);
  if (
    !isDeliveryAttachmentKey(
      parsedInput.storageKey,
      parsedInput.itemId,
      sellerId
    )
  ) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Đường dẫn ảnh bàn giao không hợp lệ.",
    });
  }

  const persistAttachment = async (executor: typeof db) => {
    await executor
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, sellerId))
      .for("update")
      .limit(1);
    const item = await getItemContext(executor, parsedInput.itemId, true);
    if (!item) {
      return throwNotFound();
    }
    if (item.sellerId !== sellerId) {
      return throwForbidden();
    }
    if (
      item.sellerEnforcementState === "BANNED" &&
      isSellerEnforcementActive(
        {
          expiresAt: item.sellerEnforcementExpiresAt,
          state: item.sellerEnforcementState,
        },
        new Date()
      )
    ) {
      throw new ORPCError("FORBIDDEN", {
        message: "Seller hiện không thể tải bản nháp bàn giao.",
      });
    }
    if (item.status !== "IN_PROGRESS") {
      throwConflict("Chỉ có thể tải ảnh khi OrderItem đang được xử lý.");
    }

    const existing = await executor
      .select({ id: orderFile.id })
      .from(orderFile)
      .where(
        and(
          eq(orderFile.orderItemId, item.id),
          eq(orderFile.uploadedByUserId, sellerId),
          isNull(orderFile.deliverySubmissionId),
          isNull(orderFile.orderMessageId),
          like(orderFile.storageKey, `orders/${item.id}/delivery/%`)
        )
      );
    if (existing.length >= COMMERCE_IMAGE_MAX_COUNT) {
      throw new ORPCError("BAD_REQUEST", {
        message: `Mỗi lần bàn giao chỉ được đính kèm tối đa ${COMMERCE_IMAGE_MAX_COUNT} ảnh.`,
      });
    }

    const [attachment] = await executor
      .insert(orderFile)
      .values({
        byteSize: parsedInput.byteSize,
        contentType: parsedInput.contentType,
        fileName: parsedInput.fileName,
        orderId: item.orderId,
        orderItemId: item.id,
        storageKey: parsedInput.storageKey,
        uploadedByUserId: sellerId,
      })
      .returning();
    if (!attachment) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Không thể lưu ảnh bàn giao.",
      });
    }
    return attachment;
  };

  try {
    const transactionCapableDatabase = database as typeof database & {
      transaction?: <Result>(
        callback: (transaction: typeof db) => Promise<Result>
      ) => Promise<Result>;
    };
    if (transactionCapableDatabase.transaction) {
      return await transactionCapableDatabase.transaction(persistAttachment);
    }
    return await persistAttachment(database);
  } catch (error) {
    try {
      const [persisted] = await database
        .select({ id: orderFile.id })
        .from(orderFile)
        .where(
          and(
            eq(orderFile.storageKey, parsedInput.storageKey),
            eq(orderFile.uploadedByUserId, sellerId)
          )
        )
        .limit(1);
      if (!persisted) {
        await deleteOrderFileObject(parsedInput.storageKey, storage);
      }
    } catch {
      // Maintenance retries persisted drafts; an untracked object is best-effort cleanup.
    }
    throw error;
  }
};

export const discardDeliveryAttachment = async ({
  attachmentId,
  database = db,
  sellerId,
  storage,
}: {
  attachmentId: string;
  database?: typeof db;
  sellerId: string;
  storage?: ManagedObjectStore;
}): Promise<void> => {
  const discardAttachment = async (executor: typeof db): Promise<void> => {
    await executor
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, sellerId))
      .for("update")
      .limit(1);
    const [enforcement] = await executor
      .select({
        expiresAt: sellerEnforcement.expiresAt,
        state: sellerEnforcement.state,
      })
      .from(sellerEnforcement)
      .where(eq(sellerEnforcement.sellerId, sellerId))
      .limit(1);
    if (
      enforcement?.state === "BANNED" &&
      isSellerEnforcementActive(enforcement)
    ) {
      throw new ORPCError("FORBIDDEN", {
        message: "Seller hiện không thể xóa bản nháp bàn giao.",
      });
    }

    const [attachment] = await executor
      .select({
        id: orderFile.id,
        storageKey: orderFile.storageKey,
      })
      .from(orderFile)
      .where(
        and(
          eq(orderFile.id, attachmentId),
          eq(orderFile.uploadedByUserId, sellerId),
          isNull(orderFile.deliverySubmissionId),
          isNull(orderFile.orderMessageId),
          like(orderFile.storageKey, "orders/%/delivery/%")
        )
      )
      .limit(1);
    if (!attachment) {
      throw new ORPCError("NOT_FOUND", {
        message: "Không tìm thấy ảnh bàn giao.",
      });
    }

    await deleteOrderFileObject(attachment.storageKey, storage);
    await executor.delete(orderFile).where(eq(orderFile.id, attachment.id));
  };

  const transactionCapableDatabase = database as typeof database & {
    transaction?: <Result>(
      callback: (transaction: typeof db) => Promise<Result>
    ) => Promise<Result>;
  };
  if (transactionCapableDatabase.transaction) {
    await transactionCapableDatabase.transaction(discardAttachment);
    return;
  }
  await discardAttachment(database);
};

export const cleanupDeliveryAttachmentDrafts = async ({
  database = db,
  deleteObject = deleteOrderFileObject,
  now = new Date(),
}: {
  database?: typeof db;
  deleteObject?: (storageKey: string) => Promise<void>;
  now?: Date;
} = {}): Promise<number> => {
  const expiry = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const attachments = await database.query.orderFile.findMany({
    limit: 100,
    where: and(
      isNull(orderFile.deliverySubmissionId),
      isNull(orderFile.orderMessageId),
      lte(orderFile.createdAt, expiry),
      like(orderFile.storageKey, "orders/%/delivery/%")
    ),
  });

  const deletedCounts = await Promise.all(
    attachments.map(async (attachment) => {
      await deleteObject(attachment.storageKey);
      const [deleted] = await database
        .delete(orderFile)
        .where(
          and(
            eq(orderFile.id, attachment.id),
            isNull(orderFile.deliverySubmissionId),
            isNull(orderFile.orderMessageId)
          )
        )
        .returning({ id: orderFile.id });
      return deleted ? 1 : 0;
    })
  );
  return deletedCounts.reduce<number>((total, count) => total + count, 0);
};

const getExistingLifecycleEvent = async (
  executor: FulfillmentExecutor,
  itemId: string,
  commandKey: string
): Promise<ExistingLifecycleEvent | undefined> => {
  const [event] = await executor
    .select({
      artifactId: orderItemLifecycleEvent.artifactId,
      artifactType: orderItemLifecycleEvent.artifactType,
      effectiveAt: orderItemLifecycleEvent.effectiveAt,
      id: orderItemLifecycleEvent.id,
      newStatus: orderItemLifecycleEvent.newStatus,
    })
    .from(orderItemLifecycleEvent)
    .where(
      and(
        eq(orderItemLifecycleEvent.orderItemId, itemId),
        eq(orderItemLifecycleEvent.commandKey, commandKey)
      )
    )
    .limit(1);
  return event;
};

const getLatestLifecycleEvent = async (
  executor: FulfillmentExecutor,
  itemId: string
): Promise<ExistingLifecycleEvent | undefined> => {
  const [event] = await executor
    .select({
      artifactId: orderItemLifecycleEvent.artifactId,
      artifactType: orderItemLifecycleEvent.artifactType,
      effectiveAt: orderItemLifecycleEvent.effectiveAt,
      id: orderItemLifecycleEvent.id,
      newStatus: orderItemLifecycleEvent.newStatus,
    })
    .from(orderItemLifecycleEvent)
    .where(eq(orderItemLifecycleEvent.orderItemId, itemId))
    .orderBy(
      desc(orderItemLifecycleEvent.effectiveAt),
      desc(orderItemLifecycleEvent.createdAt),
      desc(orderItemLifecycleEvent.id)
    )
    .limit(1);
  return event;
};

const toCommandResult = (
  itemId: string,
  event: ExistingLifecycleEvent,
  changed: boolean
): OrderItemCommandResult => ({
  artifactId: event.artifactId,
  artifactType: event.artifactType,
  changed,
  effectiveAt: event.effectiveAt.toISOString(),
  eventId: event.id,
  orderItemId: itemId,
  status: event.newStatus,
});

const assertSellerCanAct = (
  item: OrderItemContext,
  actorId: string,
  now: Date,
  enforceSellerAvailability: boolean
): void => {
  if (item.sellerId !== actorId) {
    throwForbidden();
  }
  if (
    enforceSellerAvailability &&
    isSellerEnforcementActive(
      {
        expiresAt: item.sellerEnforcementExpiresAt,
        state: item.sellerEnforcementState ?? "CLEAR",
      },
      now
    ) &&
    item.sellerEnforcementState === "BANNED"
  ) {
    throw new ORPCError("FORBIDDEN", {
      message: "Seller hiện không thể tiếp tục Fulfillment.",
    });
  }
};

const assertBuyerCanAct = (item: OrderItemContext, actorId: string): void => {
  if (item.buyerId !== actorId) {
    throwForbidden();
  }
};

const assertCommandActor = ({
  actorId,
  actorType,
  item,
  now,
  command,
}: {
  actorId: string | null;
  actorType: FulfillmentActorType;
  command: OrderItemTransitionCommand;
  item: OrderItemContext;
  now: Date;
}): void => {
  if (
    command.type === "START_FULFILLMENT" ||
    command.type === "SUBMIT_DELIVERY"
  ) {
    if (!actorId || actorType !== "SELLER") {
      return throwForbidden();
    }
    assertSellerCanAct(item, actorId, now, true);
    return;
  }

  if (command.type === "CANCEL_BY_SELLER") {
    if (!actorId || actorType !== "SELLER") {
      return throwForbidden();
    }
    assertSellerCanAct(item, actorId, now, true);
    return;
  }

  if (
    command.type === "CANCEL_BY_BUYER" ||
    command.type === "CONFIRM_DELIVERY" ||
    command.type === "OPEN_DISPUTE"
  ) {
    if (!actorId || actorType !== "BUYER") {
      return throwForbidden();
    }
    assertBuyerCanAct(item, actorId);
    return;
  }

  if (actorType !== "SYSTEM" || actorId !== null) {
    throwForbidden();
  }
};

const getEventReason = (command: OrderItemTransitionCommand): string | null => {
  switch (command.type) {
    case "CANCEL_BY_SELLER": {
      return command.reason.trim();
    }
    case "CANCEL_BY_SYSTEM": {
      return command.reason.trim();
    }
    case "OPEN_DISPUTE": {
      return command.reason.trim();
    }
    case "CANCEL_BY_BUYER": {
      return "Buyer cancelled before Seller fulfillment";
    }
    case "EXPIRE_DELIVERY_REVIEW": {
      return "Buyer review window expired";
    }
    case "EXPIRE_WARRANTY": {
      return "Warranty period expired";
    }
    case "START_FULFILLMENT": {
      return "Seller started fulfillment";
    }
    case "SUBMIT_DELIVERY": {
      return "Seller submitted delivery";
    }
    case "CONFIRM_DELIVERY": {
      return "Buyer confirmed delivery";
    }
    default: {
      return null;
    }
  }
};

const formatOrderItemStatusVi = (status: OrderItemStatus): string => {
  switch (status) {
    case "AWAITING_SELLER": {
      return "Chờ người bán xác nhận";
    }
    case "IN_PROGRESS": {
      return "Đang xử lý";
    }
    case "DELIVERED": {
      return "Đã bàn giao";
    }
    case "IN_WARRANTY": {
      return "Đang bảo hành";
    }
    case "CLOSED": {
      return "Hoàn tất";
    }
    case "CANCELLED": {
      return "Đã hủy";
    }
    case "REFUNDED": {
      return "Đã hoàn tiền";
    }
    case "DISPUTED": {
      return "Đang khiếu nại";
    }
    default: {
      return status;
    }
  }
};

const getNotificationCopy = (
  command: OrderItemTransitionCommand,
  status: OrderItemStatus
): { body: string; title: string } => {
  if (command.type === "START_FULFILLMENT") {
    return {
      body: "Người bán đã bắt đầu xử lý đơn hàng của bạn.",
      title: "Đơn hàng đang xử lý",
    };
  }
  if (command.type === "OPEN_DISPUTE") {
    return {
      body: "Người mua đã gửi yêu cầu khiếu nại cho đơn hàng này.",
      title: "Khiếu nại mới cần xử lý",
    };
  }
  if (command.type === "SUBMIT_DELIVERY") {
    return {
      body: "Người bán đã gửi thông tin bàn giao sản phẩm/dịch vụ.",
      title: "Sản phẩm đã được bàn giao",
    };
  }
  if (command.type === "CONFIRM_DELIVERY") {
    return {
      body: "Người mua đã xác nhận nhận hàng thành công.",
      title: "Đã xác nhận nhận hàng",
    };
  }
  if (command.type === "CANCEL_BY_BUYER") {
    return {
      body: "Người mua đã hủy đơn hàng này.",
      title: "Đơn hàng đã hủy",
    };
  }
  if (command.type === "CANCEL_BY_SELLER") {
    return {
      body: "Người bán đã hủy đơn hàng này.",
      title: "Đơn hàng đã hủy",
    };
  }
  if (command.type === "CANCEL_BY_SYSTEM") {
    return {
      body: "Đơn hàng đã được hệ thống hủy và hoàn tiền lại vào ví của bạn.",
      title: "Đã bảo vệ khoản thanh toán",
    };
  }
  if (command.type === "EXPIRE_DELIVERY_REVIEW") {
    return {
      body: "Hết thời gian kiểm tra, hệ thống đã tự động xác nhận hoàn tất bàn giao.",
      title: "Tự động xác nhận giao hàng",
    };
  }
  if (command.type === "EXPIRE_WARRANTY") {
    return {
      body: "Đơn hàng đã hoàn tất thời gian bảo hành thành công.",
      title: "Hoàn tất bảo hành",
    };
  }

  return {
    body: `Đơn hàng của bạn đã chuyển sang trạng thái ${formatOrderItemStatusVi(status)}.`,
    title: "Cập nhật đơn hàng",
  };
};

const insertNotifications = async (
  executor: FulfillmentExecutor,
  item: OrderItemContext,
  eventId: string,
  command: OrderItemTransitionCommand,
  status: OrderItemStatus,
  now: Date,
  actorUserId: string | null
): Promise<void> => {
  const recipients = [
    { targetPath: `/orders/${item.orderId}`, userId: item.buyerId },
    {
      targetPath: "/seller/store?section=orders",
      userId: item.sellerId,
    },
  ];
  if (command.type === "OPEN_DISPUTE") {
    recipients.push(
      ...(await listNotificationRecipientsByRole(executor, {
        limit: MAX_ADMIN_NOTIFICATION_RECIPIENTS,
        role: "ADMIN",
        targetPath: "/disputes",
      }))
    );
  }

  const copy = getNotificationCopy(command, status);
  await createNotificationEvent(executor, {
    actorUserId,
    body: copy.body,
    context: {
      orderId: item.orderId,
      orderItemId: item.id,
      status,
    },
    eventType:
      command.type === "OPEN_DISPUTE"
        ? "dispute.opened"
        : "order_item.transition",
    now,
    recipients,
    sourceId: eventId,
    sourceType: "ORDER_ITEM_LIFECYCLE",
    title: copy.title,
  });
};

export const refundEscrow = async (
  executor: FulfillmentExecutor,
  item: EscrowResolutionContext,
  now: Date
): Promise<string> => {
  if (item.escrowHoldStatus !== "HELD") {
    throwConflict("EscrowHold không còn ở trạng thái HELD.");
  }

  const accounts = await ensureWalletAccounts(executor, item.buyerId);
  const [wallet] = await executor
    .select()
    .from(userWallet)
    .where(eq(userWallet.id, accounts.wallet.id))
    .for("update")
    .limit(1);
  if (!wallet || wallet.heldBalance < item.escrowAmount) {
    return throwConflict("Held Balance của Buyer không đủ để hoàn tiền.");
  }

  const [refundTransaction] = await Promise.all([
    recordBalancedLedgerTransaction(executor, {
      amount: item.escrowAmount,
      description: `REFUND ORDER_ITEM ${item.id}`,
      postings: [
        {
          accountId: accounts.heldAccount.id,
          debitAmount: item.escrowAmount,
        },
        {
          accountId: accounts.availableAccount.id,
          creditAmount: item.escrowAmount,
        },
      ],
      reference: `AVTX-REFUND-${item.id}-${crypto
        .randomUUID()
        .replaceAll("-", "")
        .slice(0, TRANSACTION_REFERENCE_SUFFIX_LENGTH)
        .toUpperCase()}`,
      type: "REFUND",
    }),
    (async () => {
      const [walletAfterUpdate] = await executor
        .update(userWallet)
        .set({
          availableBalance: wallet.availableBalance + item.escrowAmount,
          heldBalance: wallet.heldBalance - item.escrowAmount,
          updatedAt: now,
        })
        .where(
          and(
            eq(userWallet.id, accounts.wallet.id),
            gte(userWallet.heldBalance, item.escrowAmount)
          )
        )
        .returning({
          availableBalance: userWallet.availableBalance,
          heldBalance: userWallet.heldBalance,
        });
      if (!walletAfterUpdate) {
        throwConflict("Số dư Buyer vừa thay đổi. Vui lòng thử lại.");
      }
      return walletAfterUpdate;
    })(),
    (async () => {
      const [updatedHold] = await executor
        .update(escrowHold)
        .set({ status: "REFUNDED", updatedAt: now })
        .where(
          and(
            eq(escrowHold.id, item.escrowHoldId),
            eq(escrowHold.status, "HELD")
          )
        )
        .returning({ id: escrowHold.id });
      if (!updatedHold) {
        throwConflict("EscrowHold vừa được xử lý bởi một request khác.");
      }
      return updatedHold;
    })(),
  ]);

  await createNotificationEvent(executor, {
    body: `Khoản hoàn tiền ${item.escrowAmount.toLocaleString("vi-VN")} VND đã được ghi có vào ví của bạn.`,
    context: {
      amount: item.escrowAmount,
      orderItemId: item.id,
      transactionId: refundTransaction.id,
    },
    email: {
      htmlBody: `<p>Khoản hoàn tiền ${item.escrowAmount.toLocaleString("vi-VN")} VND đã được ghi có vào ví của bạn.</p>`,
      recipientUserIds: [item.buyerId],
      subject: "Avin: Hoàn tiền thành công",
      textBody: `Khoản hoàn tiền ${item.escrowAmount.toLocaleString("vi-VN")} VND đã được ghi có vào ví của bạn.`,
    },
    eventType: "transaction.refund_committed",
    recipients: [
      { targetPath: `/orders/${item.orderId}`, userId: item.buyerId },
      ...(await listNotificationRecipientsByRole(executor, {
        role: "ADMIN",
        targetPath: "/disputes",
      })),
    ],
    sourceId: refundTransaction.id,
    sourceType: "LEDGER_TRANSACTION",
    title: "Hoàn tiền thành công",
  });

  return refundTransaction.id;
};

export const releaseEscrow = async (
  executor: FulfillmentExecutor,
  item: EscrowResolutionContext,
  now: Date
): Promise<string> => {
  if (item.escrowHoldStatus !== "HELD") {
    throwConflict("EscrowHold không còn ở trạng thái HELD.");
  }

  const buyerAccounts = await ensureWalletAccounts(executor, item.buyerId);
  const sellerAccounts = await ensureSellerWalletAccounts(
    executor,
    item.sellerId
  );
  const [buyerWallet] = await executor
    .select()
    .from(userWallet)
    .where(eq(userWallet.id, buyerAccounts.wallet.id))
    .for("update")
    .limit(1);
  if (!buyerWallet || buyerWallet.heldBalance < item.escrowAmount) {
    throw new ORPCError("CONFLICT", {
      message: "Held Balance của Buyer không đủ để giải ngân.",
    });
  }

  const commissionRatePercent = Number(item.commissionRatePercent);
  if (
    !Number.isFinite(commissionRatePercent) ||
    commissionRatePercent < 0 ||
    commissionRatePercent > 100
  ) {
    throw new ORPCError("CONFLICT", {
      message: "Commission rate của OrderItem không hợp lệ.",
    });
  }
  const { commissionAmount, sellerProceeds } = calculateEscrowReleaseAmounts(
    item.escrowAmount,
    commissionRatePercent
  );

  const [releaseTransaction] = await Promise.all([
    recordBalancedLedgerTransaction(executor, {
      amount: item.escrowAmount,
      description: `RELEASE ORDER_ITEM ${item.id}`,
      postings: [
        {
          accountId: buyerAccounts.heldAccount.id,
          debitAmount: item.escrowAmount,
        },
        ...(sellerProceeds > 0
          ? [
              {
                accountId: sellerAccounts.availableAccount.id,
                creditAmount: sellerProceeds,
              },
            ]
          : []),
        ...(commissionAmount > 0
          ? [
              {
                accountId: sellerAccounts.platformCommissionAccount.id,
                creditAmount: commissionAmount,
              },
            ]
          : []),
      ],
      reference: `AVTX-RELEASE-${item.id}-${crypto
        .randomUUID()
        .replaceAll("-", "")
        .slice(0, TRANSACTION_REFERENCE_SUFFIX_LENGTH)
        .toUpperCase()}`,
      type: "ESCROW_RELEASE",
    }),
    (async () => {
      const [walletAfterUpdate] = await executor
        .update(userWallet)
        .set({
          heldBalance: buyerWallet.heldBalance - item.escrowAmount,
          updatedAt: now,
        })
        .where(
          and(
            eq(userWallet.id, buyerAccounts.wallet.id),
            gte(userWallet.heldBalance, item.escrowAmount)
          )
        )
        .returning({ heldBalance: userWallet.heldBalance });
      if (!walletAfterUpdate) {
        throwConflict("Held Balance của Buyer vừa thay đổi. Vui lòng thử lại.");
      }
      return walletAfterUpdate;
    })(),
    (async () => {
      const [updatedHold] = await executor
        .update(escrowHold)
        .set({ status: "RELEASED", updatedAt: now })
        .where(
          and(
            eq(escrowHold.id, item.escrowHoldId),
            eq(escrowHold.status, "HELD")
          )
        )
        .returning({ id: escrowHold.id });
      if (!updatedHold) {
        throwConflict("EscrowHold vừa được xử lý bởi một request khác.");
      }
      return updatedHold;
    })(),
  ]);

  return releaseTransaction.id;
};

const applyItemUpdate = async (
  executor: FulfillmentExecutor,
  item: OrderItemContext,
  transition: OrderItemTransitionResult,
  now: Date
): Promise<void> => {
  const values: Partial<typeof orderItem.$inferInsert> = {
    status: transition.newStatus,
    updatedAt: now,
  };
  if (transition.deliveredAt) {
    values.deliveredAt = transition.deliveredAt;
  }
  if (transition.deliveryReviewDeadlineAt) {
    values.deliveryReviewDeadlineAt = transition.deliveryReviewDeadlineAt;
  }
  if (transition.warrantyExpiresAt) {
    values.warrantyExpiresAt = transition.warrantyExpiresAt;
  }
  if (transition.warrantyStartedAt) {
    values.warrantyStartedAt = transition.warrantyStartedAt;
  }
  if (transition.newStatus === "CANCELLED") {
    values.cancelledAt = now;
  }
  if (transition.newStatus === "DISPUTED") {
    values.disputedAt = now;
  }

  const [updated] = await executor
    .update(orderItem)
    .set(values)
    .where(and(eq(orderItem.id, item.id), eq(orderItem.status, item.status)))
    .returning({ id: orderItem.id });
  if (!updated) {
    throwConflict("OrderItem vừa được cập nhật bởi một request khác.");
  }
};

const insertDelivery = async (
  executor: FulfillmentExecutor,
  item: OrderItemContext,
  commandKey: string,
  input: DeliverySubmissionInput,
  deliveredAt: Date
): Promise<string> => {
  const [submission] = await executor
    .insert(deliverySubmission)
    .values({
      commandKey,
      deliveredAt,
      deliveryNote: input.deliveryNote.trim() || null,
      orderItemId: item.id,
      sellerId: item.sellerId,
    })
    .returning({ id: deliverySubmission.id });
  if (!submission) {
    throw new Error("DeliverySubmission was not created");
  }

  if (input.attachmentIds.length > 0) {
    const attachments = await executor
      .select({ id: orderFile.id })
      .from(orderFile)
      .where(
        and(
          inArray(orderFile.id, input.attachmentIds),
          eq(orderFile.orderItemId, item.id),
          eq(orderFile.uploadedByUserId, item.sellerId),
          isNull(orderFile.deliverySubmissionId),
          isNull(orderFile.orderMessageId),
          like(orderFile.storageKey, `orders/${item.id}/delivery/%`)
        )
      );
    if (attachments.length !== input.attachmentIds.length) {
      throwConflict("Một hoặc nhiều ảnh bàn giao không hợp lệ.");
    }
    await executor
      .update(orderFile)
      .set({ deliverySubmissionId: submission.id })
      .where(inArray(orderFile.id, input.attachmentIds));
  }

  return submission.id;
};

const insertDispute = async (
  executor: FulfillmentExecutor,
  item: OrderItemContext,
  commandKey: string,
  buyerId: string,
  evidence: DisputeEvidenceInput[],
  reason: string,
  openedAt: Date
): Promise<string> => {
  if (evidence.length === 0) {
    throwConflict("Dispute requires at least one evidence file.");
  }
  if (
    evidence.some(
      (file) => !isDisputeEvidenceKey(file.storageKey, item.id, buyerId)
    )
  ) {
    throwConflict(
      "Dispute evidence must be uploaded through the evidence route."
    );
  }

  const [createdDispute] = await executor
    .insert(dispute)
    .values({
      buyerId,
      commandKey,
      openedAt,
      orderItemId: item.id,
      previousOrderItemStatus: item.status,
      reason: reason.trim(),
      responseDeadlineAt: getDisputeResponseDeadline(openedAt),
      status: "OPEN",
    })
    .returning({ id: dispute.id });
  if (!createdDispute) {
    throw new Error("Dispute was not created");
  }

  await executor.insert(disputeEvidence).values(
    evidence.map((file) => ({
      byteSize: file.byteSize,
      contentType: file.contentType,
      description: file.description.trim(),
      disputeId: createdDispute.id,
      fileName: file.fileName.trim(),
      storageKey: file.storageKey.trim(),
      submittedAt: openedAt,
      submittedByUserId: buyerId,
      submittedLate: false,
      submitterRole: "BUYER" as const,
    }))
  );

  return createdDispute.id;
};

interface TransitionArtifact {
  artifactId: string | null;
  artifactType: string | null;
}

const createTransitionArtifact = async ({
  actorId,
  command,
  commandKey,
  executor,
  attachmentIds,
  item,
  now,
  transition,
}: {
  actorId: string | null;
  command: OrderItemTransitionCommand;
  commandKey: string;
  executor: FulfillmentExecutor;
  attachmentIds?: DeliverySubmissionInput["attachmentIds"];
  item: OrderItemContext;
  now: Date;
  transition: OrderItemTransitionResult;
}): Promise<TransitionArtifact> => {
  if (command.type === "SUBMIT_DELIVERY") {
    const artifactId = await insertDelivery(
      executor,
      item,
      commandKey,
      {
        attachmentIds: attachmentIds ?? [],
        commandKey,
        deliveryNote: command.deliveryNote,
      },
      transition.deliveredAt ?? now
    );
    return { artifactId, artifactType: "DELIVERY_SUBMISSION" };
  }

  if (command.type === "OPEN_DISPUTE") {
    if (!actorId) {
      return throwForbidden();
    }
    const artifactId = await insertDispute(
      executor,
      item,
      commandKey,
      actorId,
      command.evidence ?? [],
      command.reason,
      transition.effectiveAt
    );
    return { artifactId, artifactType: "DISPUTE" };
  }

  if (
    command.type === "CANCEL_BY_BUYER" ||
    command.type === "CANCEL_BY_SELLER" ||
    command.type === "CANCEL_BY_SYSTEM"
  ) {
    const artifactId = await refundEscrow(executor, item, now);
    return { artifactId, artifactType: "REFUND_TRANSACTION" };
  }

  if (transition.newStatus === "CLOSED") {
    const artifactId = await releaseEscrow(executor, item, now);
    await incrementCompletedOrderCounts(executor, {
      listingId: item.listingId,
      sellerId: item.sellerId,
    });
    return { artifactId, artifactType: "ESCROW_RELEASE" };
  }

  return { artifactId: null, artifactType: null };
};

const insertLifecycleEvent = async (
  executor: FulfillmentExecutor,
  {
    actorId,
    actorType,
    artifactId,
    artifactType,
    command,
    commandKey,
    item,
    now,
    transition,
  }: {
    actorId: string | null;
    actorType: FulfillmentActorType;
    artifactId: string | null;
    artifactType: string | null;
    command: OrderItemTransitionCommand;
    commandKey: string;
    item: OrderItemContext;
    now: Date;
    transition: OrderItemTransitionResult;
  }
): Promise<ExistingLifecycleEvent> => {
  const [event] = await executor
    .insert(orderItemLifecycleEvent)
    .values({
      actorType,
      actorUserId: actorId,
      artifactId,
      artifactType,
      commandKey,
      createdAt: now,
      effectiveAt: transition.effectiveAt,
      newStatus: transition.newStatus,
      oldStatus: transition.oldStatus,
      orderItemId: item.id,
      reason: getEventReason(command),
    })
    .returning({
      artifactId: orderItemLifecycleEvent.artifactId,
      artifactType: orderItemLifecycleEvent.artifactType,
      effectiveAt: orderItemLifecycleEvent.effectiveAt,
      id: orderItemLifecycleEvent.id,
      newStatus: orderItemLifecycleEvent.newStatus,
    });
  if (!event) {
    throw new Error("OrderItem lifecycle event was not created");
  }

  return event;
};

const executeTransition = ({
  actorId,
  actorType,
  command,
  commandKey,
  database,
  attachmentIds,
  itemId,
  now,
}: {
  actorId: string | null;
  actorType: FulfillmentActorType;
  command: OrderItemTransitionCommand;
  commandKey: string;
  database: typeof db;
  attachmentIds?: DeliverySubmissionInput["attachmentIds"];
  itemId: string;
  now: Date;
}): Promise<OrderItemCommandResult> =>
  database.transaction(async (transaction) => {
    if (actorType === "SELLER" && actorId) {
      await transaction
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, actorId))
        .for("update")
        .limit(1);
    }

    const item = await getItemContext(transaction, itemId, true);
    if (!item) {
      return throwNotFound();
    }

    assertCommandActor({ actorId, actorType, command, item, now });

    const existingEvent = await getExistingLifecycleEvent(
      transaction,
      item.id,
      commandKey
    );
    if (existingEvent) {
      return toCommandResult(item.id, existingEvent, false);
    }

    if (command.type === "OPEN_DISPUTE") {
      const [existingDispute] = await transaction
        .select({ id: dispute.id })
        .from(dispute)
        .where(eq(dispute.orderItemId, item.id))
        .limit(1);
      if (existingDispute) {
        throwConflict("OrderItem này đã có Dispute và không thể mở lại.");
      }
    }

    if (
      (command.type === "START_FULFILLMENT" ||
        command.type === "SUBMIT_DELIVERY") &&
      actorId
    ) {
      assertSellerCanAct(item, actorId, now, true);
    }

    if (
      (command.type === "CONFIRM_DELIVERY" ||
        command.type === "EXPIRE_DELIVERY_REVIEW") &&
      item.status === "IN_WARRANTY"
    ) {
      const currentEvent = await getLatestLifecycleEvent(transaction, item.id);
      if (!currentEvent) {
        throw new Error("OrderItem has no lifecycle event");
      }
      return toCommandResult(item.id, currentEvent, false);
    }

    let transition: OrderItemTransitionResult;
    try {
      transition = decideOrderItemTransition({
        command,
        currentStatus: item.status,
        deliveryReviewDeadlineAt: item.deliveryReviewDeadlineAt ?? undefined,
        now,
        processingDeadlineAt: item.processingDeadlineAt,
        warrantyExpiresAt: item.warrantyExpiresAt ?? undefined,
        warrantyPolicy: item.warrantyPolicy,
      });
    } catch (error) {
      if (error instanceof Error) {
        throwConflict(error.message);
      }
      throw error;
    }

    const { artifactId, artifactType } = await createTransitionArtifact({
      actorId,
      attachmentIds,
      command,
      commandKey,
      executor: transaction,
      item,
      now,
      transition,
    });
    await applyItemUpdate(transaction, item, transition, now);

    const event = await insertLifecycleEvent(transaction, {
      actorId,
      actorType,
      artifactId,
      artifactType,
      command,
      commandKey,
      item,
      now,
      transition,
    });

    await insertNotifications(
      transaction,
      item,
      event.id,
      command,
      transition.newStatus,
      now,
      actorId
    );

    return toCommandResult(item.id, event, true);
  });

export const startFulfillment = ({
  database = db,
  itemId,
  now = new Date(),
  sellerId,
  commandKey,
}: {
  commandKey: string;
  database?: typeof db;
  itemId: string;
  now?: Date;
  sellerId: string;
}): Promise<OrderItemCommandResult> =>
  executeTransition({
    actorId: sellerId,
    actorType: "SELLER",
    command: { type: "START_FULFILLMENT" },
    commandKey: commandKeyFor("START_FULFILLMENT", commandKey),
    database,
    itemId,
    now,
  });

export const submitDelivery = ({
  database = db,
  input,
  itemId,
  now = new Date(),
  sellerId,
}: {
  database?: typeof db;
  input: DeliverySubmissionInput;
  itemId: string;
  now?: Date;
  sellerId: string;
}): Promise<OrderItemCommandResult> => {
  const parsedInput = deliverySubmissionInputSchema.parse(input);
  return executeTransition({
    actorId: sellerId,
    actorType: "SELLER",
    attachmentIds: parsedInput.attachmentIds,
    command: {
      deliveryNote: parsedInput.deliveryNote,
      type: "SUBMIT_DELIVERY",
    },
    commandKey: commandKeyFor("SUBMIT_DELIVERY", parsedInput.commandKey),
    database,
    itemId,
    now,
  });
};

export const confirmDelivery = ({
  buyerId,
  commandKey,
  database = db,
  itemId,
  now = new Date(),
}: {
  buyerId: string;
  commandKey: string;
  database?: typeof db;
  itemId: string;
  now?: Date;
}): Promise<OrderItemCommandResult> =>
  executeTransition({
    actorId: buyerId,
    actorType: "BUYER",
    command: { type: "CONFIRM_DELIVERY" },
    commandKey: commandKeyFor("CONFIRM_DELIVERY", commandKey),
    database,
    itemId,
    now,
  });

export const cancelByBuyer = ({
  buyerId,
  commandKey,
  database = db,
  itemId,
  now = new Date(),
}: {
  buyerId: string;
  commandKey: string;
  database?: typeof db;
  itemId: string;
  now?: Date;
}): Promise<OrderItemCommandResult> =>
  executeTransition({
    actorId: buyerId,
    actorType: "BUYER",
    command: { type: "CANCEL_BY_BUYER" },
    commandKey: commandKeyFor("CANCEL_BY_BUYER", commandKey),
    database,
    itemId,
    now,
  });

export const cancelBySeller = ({
  database = db,
  input,
  itemId,
  now = new Date(),
  sellerId,
}: {
  database?: typeof db;
  input: z.infer<typeof sellerCancellationInputSchema>;
  itemId: string;
  now?: Date;
  sellerId: string;
}): Promise<OrderItemCommandResult> => {
  const parsedInput = sellerCancellationInputSchema.parse(input);
  return executeTransition({
    actorId: sellerId,
    actorType: "SELLER",
    command: { reason: parsedInput.reason, type: "CANCEL_BY_SELLER" },
    commandKey: commandKeyFor("CANCEL_BY_SELLER", parsedInput.commandKey),
    database,
    itemId,
    now,
  });
};

export const cancelOrderItemForSellerEnforcement = ({
  actionId,
  database = db,
  itemId,
  now = new Date(),
}: {
  actionId: string;
  database?: typeof db;
  itemId: string;
  now?: Date;
}): Promise<OrderItemCommandResult> =>
  executeTransition({
    actorId: null,
    actorType: "SYSTEM",
    command: {
      reason: "Seller Enforcement ban remediation",
      type: "CANCEL_BY_SYSTEM",
    },
    commandKey: commandKeyFor(
      "CANCEL_BY_SYSTEM",
      `seller-enforcement:${actionId}:${itemId}`
    ),
    database,
    itemId,
    now,
  });

export const openDispute = ({
  buyerId,
  database = db,
  input,
  itemId,
  now = new Date(),
}: {
  buyerId: string;
  database?: typeof db;
  input: z.infer<typeof disputeInputSchema>;
  itemId: string;
  now?: Date;
}): Promise<OrderItemCommandResult> => {
  const parsedInput = disputeInputSchema.parse(input);
  return executeTransition({
    actorId: buyerId,
    actorType: "BUYER",
    command: {
      evidence: parsedInput.evidence,
      reason: parsedInput.reason,
      type: "OPEN_DISPUTE",
    },
    commandKey: commandKeyFor("OPEN_DISPUTE", parsedInput.commandKey),
    database,
    itemId,
    now,
  });
};

export const expireDeliveryReviews = async ({
  database = db,
  limit = MAX_DUE_DELIVERY_REVIEWS,
  now = new Date(),
}: {
  database?: typeof db;
  limit?: number;
  now?: Date;
}): Promise<{ expiredItemIds: string[] }> => {
  const dueItems = await database
    .select({ id: orderItem.id })
    .from(orderItem)
    .where(
      and(
        eq(orderItem.status, "DELIVERED"),
        lte(orderItem.deliveryReviewDeadlineAt, now)
      )
    )
    .orderBy(asc(orderItem.deliveryReviewDeadlineAt), asc(orderItem.id))
    .limit(limit);

  const expiredItemIds: string[] = [];
  for (const item of dueItems) {
    try {
      await executeTransition({
        actorId: null,
        actorType: "SYSTEM",
        command: { type: "EXPIRE_DELIVERY_REVIEW" },
        commandKey: `delivery-review-timeout:${item.id}`,
        database,
        itemId: item.id,
        now,
      });
      expiredItemIds.push(item.id);
    } catch (error) {
      if (error instanceof ORPCError && error.code === "CONFLICT") {
        continue;
      }
      throw error;
    }
  }

  return { expiredItemIds };
};

export const expireWarranties = async ({
  database = db,
  limit = MAX_DUE_WARRANTY_EXPIRIES,
  now = new Date(),
}: {
  database?: typeof db;
  limit?: number;
  now?: Date;
}): Promise<{ expiredItemIds: string[] }> => {
  const dueItems = await database
    .select({ id: orderItem.id })
    .from(orderItem)
    .where(
      and(
        eq(orderItem.status, "IN_WARRANTY"),
        lte(orderItem.warrantyExpiresAt, now)
      )
    )
    .orderBy(asc(orderItem.warrantyExpiresAt), asc(orderItem.id))
    .limit(limit);

  const expiredItemIds: string[] = [];
  for (const item of dueItems) {
    try {
      await executeTransition({
        actorId: null,
        actorType: "SYSTEM",
        command: { type: "EXPIRE_WARRANTY" },
        commandKey: `warranty-timeout:${item.id}`,
        database,
        itemId: item.id,
        now,
      });
      expiredItemIds.push(item.id);
    } catch (error) {
      if (error instanceof ORPCError && error.code === "CONFLICT") {
        continue;
      }
      throw error;
    }
  }

  return { expiredItemIds };
};

export const cancelBannedSellerItems = async ({
  database = db,
  limit = MAX_BANNED_SELLER_CANCELLATIONS,
  now = new Date(),
}: {
  database?: typeof db;
  limit?: number;
  now?: Date;
}): Promise<{ cancelledItemIds: string[] }> => {
  const bannedItems = await database
    .select({ id: orderItem.id })
    .from(orderItem)
    .innerJoin(order, eq(order.id, orderItem.orderId))
    .innerJoin(
      sellerEnforcement,
      eq(sellerEnforcement.sellerId, order.sellerId)
    )
    .where(
      and(
        inArray(orderItem.status, ["AWAITING_SELLER", "IN_PROGRESS"]),
        eq(sellerEnforcement.state, "BANNED"),
        notExists(
          database
            .select({ id: dispute.id })
            .from(dispute)
            .where(eq(dispute.orderItemId, orderItem.id))
        )
      )
    )
    .orderBy(asc(orderItem.createdAt), asc(orderItem.id))
    .limit(limit);

  const cancelledItemIds: string[] = [];
  for (const item of bannedItems) {
    try {
      await cancelOrderItemForSellerEnforcement({
        actionId: `legacy-seller-ban:${item.id}`,
        database,
        itemId: item.id,
        now,
      });
      cancelledItemIds.push(item.id);
    } catch (error) {
      if (error instanceof ORPCError && error.code === "CONFLICT") {
        continue;
      }
      throw error;
    }
  }

  return { cancelledItemIds };
};

const assertTimelineAccess = (
  item: Pick<OrderItemContext, "buyerId" | "sellerId">,
  actorId: string,
  actorRole: FulfillmentActorRole
): void => {
  if (
    (actorRole === "BUYER" && actorId !== item.buyerId) ||
    (actorRole === "SELLER" && actorId !== item.sellerId)
  ) {
    throwForbidden();
  }
};

export const getOrderItemTimeline = async ({
  actorId,
  actorRole,
  database = db,
  itemId,
}: {
  actorId: string;
  actorRole: FulfillmentActorRole;
  database?: typeof db;
  itemId: string;
}): Promise<OrderItemTimelineView> => {
  const item = await getItemContext(database, itemId, false);
  if (!item) {
    return throwNotFound();
  }
  assertTimelineAccess(item, actorId, actorRole);

  const [events, submissionRows, buyerInputFiles] = await Promise.all([
    database
      .select({
        actorType: orderItemLifecycleEvent.actorType,
        actorUserId: orderItemLifecycleEvent.actorUserId,
        artifactId: orderItemLifecycleEvent.artifactId,
        artifactType: orderItemLifecycleEvent.artifactType,
        effectiveAt: orderItemLifecycleEvent.effectiveAt,
        id: orderItemLifecycleEvent.id,
        newStatus: orderItemLifecycleEvent.newStatus,
        oldStatus: orderItemLifecycleEvent.oldStatus,
        reason: orderItemLifecycleEvent.reason,
      })
      .from(orderItemLifecycleEvent)
      .where(eq(orderItemLifecycleEvent.orderItemId, item.id))
      .orderBy(
        asc(orderItemLifecycleEvent.effectiveAt),
        asc(orderItemLifecycleEvent.createdAt),
        asc(orderItemLifecycleEvent.id)
      ),
    database
      .select({
        deliveredAt: deliverySubmission.deliveredAt,
        deliveryNote: deliverySubmission.deliveryNote,
        id: deliverySubmission.id,
        sellerId: deliverySubmission.sellerId,
      })
      .from(deliverySubmission)
      .where(eq(deliverySubmission.orderItemId, item.id))
      .limit(1),
    database
      .select({
        byteSize: orderFile.byteSize,
        contentType: orderFile.contentType,
        fileName: orderFile.fileName,
        id: orderFile.id,
        storageKey: orderFile.storageKey,
      })
      .from(orderFile)
      .where(
        and(
          eq(orderFile.orderItemId, item.id),
          eq(orderFile.uploadedByUserId, item.buyerId),
          isNull(orderFile.deliverySubmissionId),
          isNull(orderFile.orderMessageId),
          like(orderFile.storageKey, "checkouts/%")
        )
      )
      .orderBy(asc(orderFile.createdAt), asc(orderFile.id)),
  ]);
  const [submission] = submissionRows;

  const files = submission
    ? await database
        .select({
          byteSize: orderFile.byteSize,
          contentType: orderFile.contentType,
          fileName: orderFile.fileName,
          id: orderFile.id,
          storageKey: orderFile.storageKey,
        })
        .from(orderFile)
        .where(eq(orderFile.deliverySubmissionId, submission.id))
        .orderBy(asc(orderFile.createdAt), asc(orderFile.id))
    : [];

  const [itemDispute] = await database
    .select({
      buyerId: dispute.buyerId,
      id: dispute.id,
      openedAt: dispute.openedAt,
      reason: dispute.reason,
      responseDeadlineAt: dispute.responseDeadlineAt,
      status: dispute.status,
    })
    .from(dispute)
    .where(eq(dispute.orderItemId, item.id))
    .limit(1);

  const disputeEvidenceRows = itemDispute
    ? await database
        .select({
          byteSize: disputeEvidence.byteSize,
          contentType: disputeEvidence.contentType,
          description: disputeEvidence.description,
          fileName: disputeEvidence.fileName,
          id: disputeEvidence.id,
          storageKey: disputeEvidence.storageKey,
          submittedAt: disputeEvidence.submittedAt,
          submittedLate: disputeEvidence.submittedLate,
          submitterRole: disputeEvidence.submitterRole,
        })
        .from(disputeEvidence)
        .where(eq(disputeEvidence.disputeId, itemDispute.id))
        .orderBy(asc(disputeEvidence.submittedAt), asc(disputeEvidence.id))
    : [];

  return {
    buyerInput:
      item.buyerDescription !== null || buyerInputFiles.length > 0
        ? {
            description: item.buyerDescription,
            files: buyerInputFiles,
          }
        : null,
    current: {
      deliveredAt: asIso(item.deliveredAt),
      deliveryReviewDeadlineAt: asIso(item.deliveryReviewDeadlineAt),
      orderId: item.orderId,
      processingDeadlineAt: item.processingDeadlineAt.toISOString(),
      servicePackage: item.servicePackage,
      status: item.status,
      warrantyExpiresAt: asIso(item.warrantyExpiresAt),
      warrantyPolicy: item.warrantyPolicy,
      warrantyStartedAt: asIso(item.warrantyStartedAt),
    },
    deliverySubmission: submission
      ? {
          deliveredAt: submission.deliveredAt.toISOString(),
          deliveryNote: submission.deliveryNote,
          files,
          id: submission.id,
          sellerId: submission.sellerId,
        }
      : null,
    dispute: itemDispute
      ? {
          buyerId: itemDispute.buyerId,
          evidence: disputeEvidenceRows.map((evidence) => ({
            byteSize: evidence.byteSize ?? 0,
            contentType: evidence.contentType,
            description: evidence.description,
            fileName: evidence.fileName,
            id: evidence.id,
            storageKey: evidence.storageKey,
            submittedAt: evidence.submittedAt.toISOString(),
            submittedLate: evidence.submittedLate,
            submitterRole: evidence.submitterRole,
          })),
          id: itemDispute.id,
          openedAt: itemDispute.openedAt.toISOString(),
          reason: itemDispute.reason,
          responseDeadlineAt: itemDispute.responseDeadlineAt.toISOString(),
          status: itemDispute.status,
        }
      : null,
    events: events.map((event) => ({
      actorType: event.actorType,
      actorUserId: event.actorUserId,
      artifactId: event.artifactId,
      artifactType: event.artifactType,
      effectiveAt: event.effectiveAt.toISOString(),
      id: event.id,
      newStatus: event.newStatus,
      oldStatus: event.oldStatus,
      reason: event.reason,
    })),
    orderItemId: item.id,
  };
};

export const getOrderFileUrl = async ({
  actorId,
  actorRole,
  database = db,
  fileId,
  itemId,
}: {
  actorId: string;
  actorRole: FulfillmentActorRole;
  database?: typeof db;
  fileId: string;
  itemId: string;
}): Promise<{ url: string }> => {
  const item = await getItemContext(database, itemId, false);
  if (!item) {
    return throwNotFound();
  }
  assertTimelineAccess(item, actorId, actorRole);

  const [file] = await database
    .select({ storageKey: orderFile.storageKey })
    .from(orderFile)
    .where(
      and(
        eq(orderFile.id, fileId),
        eq(orderFile.orderItemId, item.id),
        or(
          isNotNull(orderFile.deliverySubmissionId),
          like(orderFile.storageKey, "checkouts/%")
        )
      )
    )
    .limit(1);
  if (!file) {
    throw new ORPCError("NOT_FOUND", {
      message: "Không tìm thấy ảnh của OrderItem.",
    });
  }
  return createSignedOrderFileUrl(file.storageKey);
};
