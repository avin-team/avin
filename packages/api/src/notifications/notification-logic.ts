export const notificationEventTypes = [
  "protection_risk_report.changes_requested",
  "protection_risk_report.corrected",
  "protection_risk_report.published",
  "protection_risk_report.rejected",
  "protection_risk_report.removed",
  "protection_risk_report.submitted",
  "protection_risk_report.under_verification",
  "protection_provider_application.approved",
  "protection_provider_application.changes_requested",
  "protection_provider_application.rejected",
  "protection_provider_application.submitted",
  "protection_provider_profile_revision.approved",
  "protection_provider_profile_revision.changes_requested",
  "protection_provider_profile_revision.rejected",
  "protection_provider_profile_revision.submitted",
  "protection_provider_risk_incident.related_report",
  "protection_provider_risk_incident.response_deadline",
  "protection_provider_risk_incident.suspended",
  "protection_provider_risk_incident.removed",
  "seller_application.submitted",
  "seller_application.approved",
  "seller_application.rejected",
  "listing.hidden",
  "listing.restored",
  "listing.archived",
  "order_item.transition",
  "dispute.opened",
  "dispute.deadline",
  "dispute.resolved",
  "transaction.deposit_credited",
  "transaction.withdrawal_requested",
  "transaction.withdrawal_approved",
  "transaction.withdrawal_paid",
  "transaction.withdrawal_rejected",
  "transaction.refund_committed",
  "transaction.reversal_committed",
  "seller_enforcement.applied",
  "seller_enforcement.lifted",
  "seller_enforcement.appeal_resolved",
  "enforcement_remediation.needs_attention",
  "review.created",
] as const;

export const NOTIFICATION_CONTEXT_STRING_MAX_LENGTH = 500;

export type NotificationEventType = (typeof notificationEventTypes)[number];

const notificationEventTypeSet = new Set<string>(notificationEventTypes);
const sensitiveContextKeyPattern =
  /account|bank|chat|evidence|kyc|password|raw|secret|snapshot|token/iu;

export interface NotificationRecipientInput {
  targetPath: string;
  userId: string;
}

export interface NotificationCursor {
  createdAt: string;
  id: string;
}

export const isNotificationEventType = (
  value: string
): value is NotificationEventType => notificationEventTypeSet.has(value);

export const isSafeNotificationTargetPath = (path: string): boolean => {
  if (!path.startsWith("/") || path.startsWith("//")) {
    return false;
  }

  try {
    const parsed = new URL(path, "https://avin.invalid");
    return (
      parsed.origin === "https://avin.invalid" &&
      !parsed.pathname.includes("..")
    );
  } catch {
    return false;
  }
};

export const normalizeNotificationRecipients = (
  recipients: readonly NotificationRecipientInput[]
): NotificationRecipientInput[] => {
  const seen = new Set<string>();
  const normalized: NotificationRecipientInput[] = [];

  for (const recipient of recipients) {
    const userId = recipient.userId.trim();
    const targetPath = recipient.targetPath.trim();
    if (
      userId.length === 0 ||
      !isSafeNotificationTargetPath(targetPath) ||
      seen.has(userId)
    ) {
      continue;
    }

    seen.add(userId);
    normalized.push({ targetPath, userId });
  }

  return normalized;
};

export const redactNotificationContext = (
  context: Record<string, unknown>
): Record<string, string | number | boolean | null> => {
  const safeContext: Record<string, string | number | boolean | null> = {};

  for (const [key, value] of Object.entries(context)) {
    if (sensitiveContextKeyPattern.test(key)) {
      continue;
    }

    if (value === null || typeof value === "boolean") {
      safeContext[key] = value;
      continue;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      safeContext[key] = value;
      continue;
    }

    if (
      typeof value === "string" &&
      value.length <= NOTIFICATION_CONTEXT_STRING_MAX_LENGTH
    ) {
      safeContext[key] = value;
    }
  }

  return safeContext;
};

export const encodeNotificationCursor = (cursor: NotificationCursor): string =>
  encodeURIComponent(JSON.stringify(cursor));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const decodeNotificationCursor = (
  value: string
): NotificationCursor | null => {
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(value));
    if (!isRecord(parsed)) {
      return null;
    }

    const { createdAt, id } = parsed;
    if (
      typeof createdAt !== "string" ||
      Number.isNaN(Date.parse(createdAt)) ||
      typeof id !== "string" ||
      id.trim().length === 0
    ) {
      return null;
    }

    return { createdAt, id };
  } catch {
    return null;
  }
};
