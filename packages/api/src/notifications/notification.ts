import type { db } from "@avin/db";
import { user } from "@avin/db/schema/auth";
import { emailDelivery, notification } from "@avin/db/schema/commerce";
import { and, eq, inArray } from "drizzle-orm";

import {
  isNotificationEventType,
  normalizeNotificationRecipients,
  redactNotificationContext,
} from "./notification-logic";
import type {
  NotificationEventType,
  NotificationRecipientInput,
} from "./notification-logic";

export type NotificationExecutor = Pick<
  typeof db,
  "insert" | "select" | "update"
>;

export interface NotificationEmailInput {
  htmlBody: string;
  recipientUserIds?: readonly string[];
  subject: string;
  textBody: string;
}

export type NotificationRole = "ADMIN" | "BUYER" | "SELLER";

export const DEFAULT_NOTIFICATION_RECIPIENT_LIMIT = 100;

export interface CreateNotificationEventInput {
  actorUserId?: string | null;
  body: string;
  context?: Record<string, unknown>;
  email?: NotificationEmailInput;
  eventType: NotificationEventType;
  now?: Date;
  recipients: readonly NotificationRecipientInput[];
  sourceId: string;
  sourceType: string;
  title: string;
}

export const createNotificationEvent = async (
  executor: NotificationExecutor,
  input: CreateNotificationEventInput
): Promise<void> => {
  if (!isNotificationEventType(input.eventType)) {
    throw new Error(
      `Notification event is not allowlisted: ${input.eventType}`
    );
  }

  const sourceId = input.sourceId.trim();
  const sourceType = input.sourceType.trim();
  if (sourceId.length === 0 || sourceType.length === 0) {
    throw new Error("Notification source identity is required");
  }

  const recipients = normalizeNotificationRecipients(input.recipients).filter(
    (recipient) => recipient.userId !== input.actorUserId
  );
  if (recipients.length === 0) {
    return;
  }

  const now = input.now ?? new Date();
  const context = redactNotificationContext(input.context ?? {});
  await executor
    .insert(notification)
    .values(
      recipients.map((recipient) => ({
        body: input.body,
        context,
        createdAt: now,
        deepLink: recipient.targetPath,
        eventType: input.eventType,
        recipientUserId: recipient.userId,
        sourceId,
        sourceType,
        title: input.title,
      }))
    )
    .onConflictDoNothing({
      target: [
        notification.eventType,
        notification.sourceType,
        notification.sourceId,
        notification.recipientUserId,
      ],
    });

  const { email } = input;
  if (!email) {
    return;
  }

  const emailRecipientIds = new Set(
    email.recipientUserIds ?? recipients.map((recipient) => recipient.userId)
  );
  const selectedRecipientIds: string[] = [];
  for (const recipient of recipients) {
    if (emailRecipientIds.has(recipient.userId)) {
      selectedRecipientIds.push(recipient.userId);
    }
  }
  if (selectedRecipientIds.length === 0) {
    return;
  }

  const users = await executor
    .select({ email: user.email, id: user.id })
    .from(user)
    .where(inArray(user.id, selectedRecipientIds));
  if (users.length === 0) {
    return;
  }

  await executor
    .insert(emailDelivery)
    .values(
      users.map((recipient) => ({
        createdAt: now,
        eventType: input.eventType,
        firstAttemptAt: null,
        htmlBody: email.htmlBody,
        nextAttemptAt: now,
        recipientEmail: recipient.email,
        recipientUserId: recipient.id,
        retryWindowStartedAt: now,
        sourceId,
        sourceType,
        subject: email.subject,
        textBody: email.textBody,
        updatedAt: now,
      }))
    )
    .onConflictDoNothing({
      target: [
        emailDelivery.eventType,
        emailDelivery.sourceType,
        emailDelivery.sourceId,
        emailDelivery.recipientUserId,
        emailDelivery.channel,
      ],
    });
};

export const listNotificationRecipientsByRole = async (
  executor: NotificationExecutor,
  {
    role,
    targetPath,
    limit = DEFAULT_NOTIFICATION_RECIPIENT_LIMIT,
  }: {
    limit?: number;
    role: NotificationRole;
    targetPath: string;
  }
): Promise<NotificationRecipientInput[]> => {
  const conditions = [eq(user.role, role)];
  if (role === "ADMIN") {
    conditions.push(eq(user.banned, false), eq(user.twoFactorEnabled, true));
  }

  const rows = await executor
    .select({ id: user.id })
    .from(user)
    .where(and(...conditions))
    .limit(limit);

  return rows.map(({ id }) => ({ targetPath, userId: id }));
};
