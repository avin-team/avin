import { notification } from "@avin/db/schema/commerce";
import { ORPCError } from "@orpc/server";
import { and, count, desc, eq, isNull, lt, or } from "drizzle-orm";

import type { NotificationExecutor } from "./notification";
import {
  decodeNotificationCursor,
  encodeNotificationCursor,
  isSafeNotificationTargetPath,
} from "./notification-logic";

export const DEFAULT_NOTIFICATION_PAGE_SIZE = 20;
export const MAX_NOTIFICATION_PAGE_SIZE = 50;

const SELLER_WITHDRAWAL_NOTIFICATION_PATH = "/seller/store?section=finance";
const sellerWithdrawalEventTypes = new Set([
  "transaction.withdrawal_approved",
  "transaction.withdrawal_paid",
  "transaction.withdrawal_rejected",
  "transaction.withdrawal_requested",
]);

export interface ListNotificationsInput {
  cursor?: string;
  limit?: number;
  unreadOnly?: boolean;
}

export interface NotificationView {
  body: string;
  context: Record<string, boolean | null | number | string>;
  createdAt: string;
  deepLink: string;
  eventType: string;
  id: string;
  readAt: string | null;
  sourceId: string;
  sourceType: string;
  title: string;
}

export interface NotificationPage {
  items: NotificationView[];
  nextCursor: string | null;
  unreadCount: number;
}

export const getUnreadNotificationCount = async ({
  database,
  userId,
}: {
  database: NotificationExecutor;
  userId: string;
}): Promise<number> => {
  const [row] = await database
    .select({ count: count() })
    .from(notification)
    .where(
      and(eq(notification.recipientUserId, userId), isNull(notification.readAt))
    );

  return row?.count ?? 0;
};

const getPageSize = (limit: number | undefined): number => {
  const value = limit ?? DEFAULT_NOTIFICATION_PAGE_SIZE;
  if (
    !Number.isInteger(value) ||
    value < 1 ||
    value > MAX_NOTIFICATION_PAGE_SIZE
  ) {
    throw new ORPCError("BAD_REQUEST", {
      message: `Notification limit must be between 1 and ${MAX_NOTIFICATION_PAGE_SIZE}.`,
    });
  }
  return value;
};

const isSellerWithdrawalNotification = (
  row: typeof notification.$inferSelect
): boolean =>
  sellerWithdrawalEventTypes.has(row.eventType) ||
  (row.eventType === "transaction.reversal_committed" &&
    typeof row.context.withdrawalRequestId === "string");

const toNotificationView = (
  row: typeof notification.$inferSelect
): NotificationView => {
  const { deepLink: notificationDeepLink } = row;
  let deepLink = "/notifications";
  if (isSellerWithdrawalNotification(row)) {
    deepLink = SELLER_WITHDRAWAL_NOTIFICATION_PATH;
  } else if (isSafeNotificationTargetPath(notificationDeepLink)) {
    deepLink = notificationDeepLink;
  }

  return {
    body: row.body,
    context: row.context,
    createdAt: row.createdAt.toISOString(),
    deepLink,
    eventType: row.eventType,
    id: row.id,
    readAt: row.readAt?.toISOString() ?? null,
    sourceId: row.sourceId,
    sourceType: row.sourceType,
    title: row.title,
  };
};

export const listNotifications = async ({
  database,
  input,
  userId,
}: {
  database: NotificationExecutor;
  input?: ListNotificationsInput;
  userId: string;
}): Promise<NotificationPage> => {
  const pageSize = getPageSize(input?.limit);
  const conditions = [eq(notification.recipientUserId, userId)];
  if (input?.unreadOnly) {
    conditions.push(isNull(notification.readAt));
  }

  if (input?.cursor) {
    const cursor = decodeNotificationCursor(input.cursor);
    if (!cursor) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Notification cursor is invalid.",
      });
    }

    const cursorDate = new Date(cursor.createdAt);
    const cursorCondition = or(
      lt(notification.createdAt, cursorDate),
      and(
        eq(notification.createdAt, cursorDate),
        lt(notification.id, cursor.id)
      )
    );
    if (cursorCondition) {
      conditions.push(cursorCondition);
    }
  }

  const [rows, unreadRows] = await Promise.all([
    database
      .select()
      .from(notification)
      .where(and(...conditions))
      .orderBy(desc(notification.createdAt), desc(notification.id))
      .limit(pageSize + 1),
    database
      .select({ count: count() })
      .from(notification)
      .where(
        and(
          eq(notification.recipientUserId, userId),
          isNull(notification.readAt)
        )
      ),
  ]);

  const hasNextPage = rows.length > pageSize;
  const pageRows = hasNextPage ? rows.slice(0, pageSize) : rows;
  const lastRow = pageRows.at(-1);

  return {
    items: pageRows.map(toNotificationView),
    nextCursor:
      hasNextPage && lastRow
        ? encodeNotificationCursor({
            createdAt: lastRow.createdAt.toISOString(),
            id: lastRow.id,
          })
        : null,
    unreadCount: unreadRows[0]?.count ?? 0,
  };
};

export const markNotificationRead = async ({
  database,
  now = new Date(),
  notificationId,
  userId,
}: {
  database: NotificationExecutor;
  now?: Date;
  notificationId: string;
  userId: string;
}): Promise<{ id: string; readAt: string }> => {
  const [updated] = await database
    .update(notification)
    .set({ readAt: now })
    .where(
      and(
        eq(notification.id, notificationId),
        eq(notification.recipientUserId, userId)
      )
    )
    .returning({ id: notification.id, readAt: notification.readAt });

  if (!updated || !updated.readAt) {
    throw new ORPCError("NOT_FOUND", {
      message: "Không tìm thấy Notification.",
    });
  }

  return { id: updated.id, readAt: updated.readAt.toISOString() };
};

export const markAllNotificationsRead = async ({
  database,
  now = new Date(),
  userId,
}: {
  database: NotificationExecutor;
  now?: Date;
  userId: string;
}): Promise<{ readAt: string }> => {
  await database
    .update(notification)
    .set({ readAt: now })
    .where(
      and(eq(notification.recipientUserId, userId), isNull(notification.readAt))
    );

  return { readAt: now.toISOString() };
};
