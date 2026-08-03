/* eslint-disable no-await-in-loop, react-doctor/async-await-in-loop */

import type { AccountRole } from "@avin/auth/permissions";
import { db } from "@avin/db";
import { user } from "@avin/db/schema/auth";
import {
  deliverySubmission,
  dispute,
  escrowHold,
  notification,
  order,
  orderFile,
  orderItem,
  orderItemLifecycleEvent,
} from "@avin/db/schema/commerce";
import type {
  OrderItemStatus,
  ServicePackageSnapshot,
  WarrantyPolicySnapshot,
} from "@avin/db/schema/commerce";
import { userWallet } from "@avin/db/schema/wallet";
import { ORPCError } from "@orpc/server";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  lte,
  or,
} from "drizzle-orm";
import { z } from "zod";

import { recordBalancedLedgerTransaction } from "../wallet/ledger";
import { ensureWalletAccounts } from "../wallet/service";
import type { CommerceExecutor } from "./cart";
import { calculateEscrowReleaseAmounts } from "./commission";
import { decideOrderItemTransition } from "./fulfillment-state";
import type {
  OrderItemTransitionCommand,
  OrderItemTransitionResult,
} from "./fulfillment-state";

export type FulfillmentActorType = "BUYER" | "SELLER" | "SYSTEM";
export type FulfillmentActorRole = Extract<
  AccountRole,
  "ADMIN" | "BUYER" | "SELLER"
>;

const COMMAND_KEY_MAX_LENGTH = 128;
const CONTENT_TYPE_MAX_LENGTH = 255;
const DELIVERY_FILE_LIMIT = 20;
const DELIVERY_NOTE_MAX_LENGTH = 20_000;
const FILE_NAME_MAX_LENGTH = 255;
const MAX_ADMIN_NOTIFICATION_RECIPIENTS = 100;
const MAX_BANNED_SELLER_CANCELLATIONS = 100;
const MAX_DUE_DELIVERY_REVIEWS = 100;
const REASON_MAX_LENGTH = 5000;
const STORAGE_KEY_MAX_LENGTH = 512;
const TRANSACTION_REFERENCE_SUFFIX_LENGTH = 12;

const commandKeySchema = z.string().trim().min(1).max(COMMAND_KEY_MAX_LENGTH);

const orderFileInputSchema = z
  .object({
    byteSize: z.number().int().nonnegative().nullable().optional(),
    contentType: z.string().trim().min(1).max(CONTENT_TYPE_MAX_LENGTH),
    fileName: z.string().trim().min(1).max(FILE_NAME_MAX_LENGTH),
    storageKey: z.string().trim().min(1).max(STORAGE_KEY_MAX_LENGTH),
  })
  .superRefine((file, context) => {
    if (file.contentType !== "text/uri-list") {
      return;
    }

    try {
      const url = new URL(file.storageKey);
      if (url.protocol === "http:" || url.protocol === "https:") {
        return;
      }
    } catch {
      // Fall through to the validation issue below.
    }

    context.addIssue({
      code: "custom",
      message: "URI-list evidence must use an HTTP or HTTPS URL",
      path: ["storageKey"],
    });
  });

export const fulfillmentCommandInputSchema = z.object({
  commandKey: commandKeySchema,
});

export const sellerCancellationInputSchema =
  fulfillmentCommandInputSchema.extend({
    reason: z.string().trim().min(1).max(REASON_MAX_LENGTH),
  });

export const disputeInputSchema = fulfillmentCommandInputSchema.extend({
  reason: z.string().trim().min(1).max(REASON_MAX_LENGTH),
});

export const deliverySubmissionInputSchema =
  fulfillmentCommandInputSchema.extend({
    deliveryNote: z.string().trim().min(1).max(DELIVERY_NOTE_MAX_LENGTH),
    files: z
      .array(orderFileInputSchema)
      .min(1, "Delivery requires at least one evidence file")
      .max(DELIVERY_FILE_LIMIT),
  });

export type DeliverySubmissionInput = z.infer<
  typeof deliverySubmissionInputSchema
>;

type FulfillmentExecutor = CommerceExecutor;

interface OrderItemContext {
  buyerId: string;
  commissionRatePercent: string;
  deliveredAt: Date | null;
  deliveryReviewDeadlineAt: Date | null;
  escrowAmount: number;
  escrowHoldId: string;
  escrowHoldStatus: "CANCELLED" | "HELD" | "REFUNDED" | "RELEASED";
  id: string;
  orderId: string;
  processingDeadlineAt: Date;
  servicePackage: ServicePackageSnapshot | null;
  sellerBanExpires: Date | null;
  sellerBanned: boolean;
  sellerId: string;
  status: OrderItemStatus;
  warrantyExpiresAt: Date | null;
  warrantyPolicy: WarrantyPolicySnapshot;
  warrantyStartedAt: Date | null;
}

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
  deliverySubmission: {
    deliveredAt: string;
    deliveryNote: string;
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
    id: string;
    openedAt: string;
    reason: string;
    status: "OPEN";
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
      buyerId: order.buyerId,
      commissionRatePercent: orderItem.commissionRatePercent,
      deliveredAt: orderItem.deliveredAt,
      deliveryReviewDeadlineAt: orderItem.deliveryReviewDeadlineAt,
      escrowAmount: escrowHold.amount,
      escrowHoldId: escrowHold.id,
      escrowHoldStatus: escrowHold.status,
      id: orderItem.id,
      orderId: order.id,
      processingDeadlineAt: orderItem.processingDeadlineAt,
      sellerBanExpires: user.banExpires,
      sellerBanned: user.banned,
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
    .innerJoin(user, eq(user.id, order.sellerId))
    .where(eq(orderItem.id, itemId));

  const [item] = lock
    ? await query.for("update").limit(1)
    : await query.limit(1);
  return item;
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
    (item.sellerBanned ||
      (item.sellerBanExpires !== null && item.sellerBanExpires > now))
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
    assertSellerCanAct(item, actorId, now, false);
    return;
  }

  if (command.type === "CANCEL_BY_SELLER") {
    if (!actorId || actorType !== "SELLER") {
      return throwForbidden();
    }
    assertSellerCanAct(item, actorId, now, false);
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

const getNotificationCopy = (
  command: OrderItemTransitionCommand,
  status: OrderItemStatus
): { body: string; title: string } => {
  if (command.type === "OPEN_DISPUTE") {
    return {
      body: "Buyer đã mở Dispute cho OrderItem này.",
      title: "Dispute mới cần xử lý",
    };
  }
  if (command.type === "SUBMIT_DELIVERY") {
    return {
      body: "Seller đã gửi DeliverySubmission mới.",
      title: "OrderItem đã được giao",
    };
  }
  if (command.type === "CONFIRM_DELIVERY") {
    return {
      body: "Buyer đã xác nhận DeliverySubmission.",
      title: "Buyer đã xác nhận giao hàng",
    };
  }

  return {
    body: `OrderItem đã chuyển sang trạng thái ${status}.`,
    title: "Cập nhật OrderItem",
  };
};

const insertNotifications = async (
  executor: FulfillmentExecutor,
  item: OrderItemContext,
  eventId: string,
  command: OrderItemTransitionCommand,
  status: OrderItemStatus,
  now: Date
): Promise<void> => {
  const recipientIds = new Set([item.buyerId, item.sellerId]);
  if (command.type === "OPEN_DISPUTE") {
    const adminRows = await executor
      .select({ id: user.id })
      .from(user)
      .where(eq(user.role, "ADMIN"))
      .limit(MAX_ADMIN_NOTIFICATION_RECIPIENTS);
    for (const admin of adminRows) {
      recipientIds.add(admin.id);
    }
  }

  const copy = getNotificationCopy(command, status);
  await executor
    .insert(notification)
    .values(
      [...recipientIds].map((recipientUserId) => ({
        body: copy.body,
        createdAt: now,
        lifecycleEventId: eventId,
        orderItemId: item.id,
        recipientUserId,
        title: copy.title,
      }))
    )
    .onConflictDoNothing({
      target: [notification.lifecycleEventId, notification.recipientUserId],
    });
};

const refundEscrow = async (
  executor: FulfillmentExecutor,
  item: OrderItemContext,
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

  const refundTransaction = await recordBalancedLedgerTransaction(executor, {
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
  });

  // Ledger posting and wallet materialization must commit in this order.
  // eslint-disable-next-line react-doctor/server-sequential-independent-await
  const [updatedWallet] = await executor
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
  if (!updatedWallet) {
    throwConflict("Số dư Buyer vừa thay đổi. Vui lòng thử lại.");
  }

  const [updatedHold] = await executor
    .update(escrowHold)
    .set({ status: "REFUNDED", updatedAt: now })
    .where(
      and(eq(escrowHold.id, item.escrowHoldId), eq(escrowHold.status, "HELD"))
    )
    .returning({ id: escrowHold.id });
  if (!updatedHold) {
    throwConflict("EscrowHold vừa được xử lý bởi một request khác.");
  }

  return refundTransaction.id;
};

const releaseEscrow = async (
  executor: FulfillmentExecutor,
  item: OrderItemContext,
  now: Date
): Promise<string> => {
  if (item.escrowHoldStatus !== "HELD") {
    throwConflict("EscrowHold không còn ở trạng thái HELD.");
  }

  const buyerAccounts = await ensureWalletAccounts(executor, item.buyerId);
  const sellerAccounts = await ensureWalletAccounts(executor, item.sellerId);
  const [buyerWallet] = await executor
    .select()
    .from(userWallet)
    .where(eq(userWallet.id, buyerAccounts.wallet.id))
    .for("update")
    .limit(1);
  // Keep wallet locks in buyer-then-seller order to avoid cross-account lock inversions.
  // eslint-disable-next-line react-doctor/server-sequential-independent-await
  const [sellerWallet] = await executor
    .select()
    .from(userWallet)
    .where(eq(userWallet.id, sellerAccounts.wallet.id))
    .for("update")
    .limit(1);
  if (!buyerWallet || buyerWallet.heldBalance < item.escrowAmount) {
    throw new ORPCError("CONFLICT", {
      message: "Held Balance của Buyer không đủ để giải ngân.",
    });
  }
  if (!sellerWallet) {
    throw new ORPCError("CONFLICT", {
      message: "Wallet của Seller không khả dụng để giải ngân.",
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

  const releaseTransaction = await recordBalancedLedgerTransaction(executor, {
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
  });

  // Ledger posting must complete before wallet materialization.
  // eslint-disable-next-line react-doctor/server-sequential-independent-await
  const [updatedBuyerWallet] = await executor
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
  if (!updatedBuyerWallet) {
    throwConflict("Held Balance của Buyer vừa thay đổi. Vui lòng thử lại.");
  }

  // eslint-disable-next-line react-doctor/server-sequential-independent-await
  const [updatedSellerWallet] = await executor
    .update(userWallet)
    .set({
      availableBalance: sellerWallet.availableBalance + sellerProceeds,
      updatedAt: now,
    })
    .where(eq(userWallet.id, sellerAccounts.wallet.id))
    .returning({ availableBalance: userWallet.availableBalance });
  if (!updatedSellerWallet) {
    throwConflict("Wallet của Seller vừa thay đổi. Vui lòng thử lại.");
  }

  const [updatedHold] = await executor
    .update(escrowHold)
    .set({ status: "RELEASED", updatedAt: now })
    .where(
      and(eq(escrowHold.id, item.escrowHoldId), eq(escrowHold.status, "HELD"))
    )
    .returning({ id: escrowHold.id });
  if (!updatedHold) {
    throwConflict("EscrowHold vừa được xử lý bởi một request khác.");
  }

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
      deliveryNote: input.deliveryNote.trim(),
      orderItemId: item.id,
      sellerId: item.sellerId,
    })
    .returning({ id: deliverySubmission.id });
  if (!submission) {
    throw new Error("DeliverySubmission was not created");
  }

  if (input.files.length > 0) {
    await executor.insert(orderFile).values(
      input.files.map((file) => ({
        byteSize: file.byteSize ?? null,
        contentType: file.contentType,
        deliverySubmissionId: submission.id,
        fileName: file.fileName,
        orderId: item.orderId,
        orderItemId: item.id,
        storageKey: file.storageKey,
        uploadedByUserId: item.sellerId,
      }))
    );
  }

  return submission.id;
};

const insertDispute = async (
  executor: FulfillmentExecutor,
  item: OrderItemContext,
  commandKey: string,
  buyerId: string,
  reason: string,
  openedAt: Date
): Promise<string> => {
  const [createdDispute] = await executor
    .insert(dispute)
    .values({
      buyerId,
      commandKey,
      openedAt,
      orderItemId: item.id,
      reason: reason.trim(),
      status: "OPEN",
    })
    .returning({ id: dispute.id });
  if (!createdDispute) {
    throw new Error("Dispute was not created");
  }

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
  files,
  item,
  now,
  transition,
}: {
  actorId: string | null;
  command: OrderItemTransitionCommand;
  commandKey: string;
  executor: FulfillmentExecutor;
  files?: DeliverySubmissionInput["files"];
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
        commandKey,
        deliveryNote: command.deliveryNote,
        files: files ?? [],
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
  files,
  itemId,
  now,
}: {
  actorId: string | null;
  actorType: FulfillmentActorType;
  command: OrderItemTransitionCommand;
  commandKey: string;
  database: typeof db;
  files?: DeliverySubmissionInput["files"];
  itemId: string;
  now: Date;
}): Promise<OrderItemCommandResult> =>
  database.transaction(async (transaction) => {
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
      command,
      commandKey,
      executor: transaction,
      files,
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
      now
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
    command: {
      deliveryNote: parsedInput.deliveryNote,
      type: "SUBMIT_DELIVERY",
    },
    commandKey: commandKeyFor("SUBMIT_DELIVERY", parsedInput.commandKey),
    database,
    files: parsedInput.files,
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
    command: { reason: parsedInput.reason, type: "OPEN_DISPUTE" },
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
    .innerJoin(user, eq(user.id, order.sellerId))
    .where(
      and(
        inArray(orderItem.status, ["AWAITING_SELLER", "IN_PROGRESS"]),
        or(
          eq(user.banned, true),
          and(isNotNull(user.banExpires), gt(user.banExpires, now))
        )
      )
    )
    .orderBy(asc(orderItem.createdAt), asc(orderItem.id))
    .limit(limit);

  const cancelledItemIds: string[] = [];
  for (const item of bannedItems) {
    try {
      await executeTransition({
        actorId: null,
        actorType: "SYSTEM",
        command: {
          reason: "Seller account is banned",
          type: "CANCEL_BY_SYSTEM",
        },
        commandKey: commandKeyFor("CANCEL_BY_SYSTEM", `seller-ban:${item.id}`),
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

  const [events, submissionRows] = await Promise.all([
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
      status: dispute.status,
    })
    .from(dispute)
    .where(eq(dispute.orderItemId, item.id))
    .limit(1);

  return {
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
          id: itemDispute.id,
          openedAt: itemDispute.openedAt.toISOString(),
          reason: itemDispute.reason,
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
