import { db } from "@avin/db";
import { protectionRiskReportEmailDelivery } from "@avin/db/schema/protection";
import { and, asc, eq, isNull, lte, or } from "drizzle-orm";

import {
  EMAIL_DELIVERY_BATCH_SIZE,
  EMAIL_DELIVERY_CLAIM_LEASE_MS,
  EMAIL_DELIVERY_MAX_ATTEMPTS,
  EMAIL_DELIVERY_RETRY_WINDOW_MS,
  getEmailRetryDecision,
} from "../notifications/email-delivery";
import type { EmailSender } from "../notifications/email-delivery";

export type RiskReportEmailDeliveryRow =
  typeof protectionRiskReportEmailDelivery.$inferSelect;

const eligibleDeliveryCondition = (now: Date) =>
  and(
    or(
      eq(protectionRiskReportEmailDelivery.status, "pending"),
      eq(protectionRiskReportEmailDelivery.status, "retrying")
    ),
    lte(protectionRiskReportEmailDelivery.nextAttemptAt, now),
    or(
      isNull(protectionRiskReportEmailDelivery.claimedAt),
      lte(
        protectionRiskReportEmailDelivery.claimedAt,
        new Date(now.getTime() - EMAIL_DELIVERY_CLAIM_LEASE_MS)
      )
    )
  );

export const claimRiskReportEmailDeliveries = ({
  batchSize = EMAIL_DELIVERY_BATCH_SIZE,
  database = db,
  now = new Date(),
}: {
  batchSize?: number;
  database?: typeof db;
  now?: Date;
} = {}): Promise<RiskReportEmailDeliveryRow[]> => {
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error("Risk report email delivery batch size must be positive");
  }

  return database.transaction(async (transaction) => {
    const candidates = await transaction
      .select()
      .from(protectionRiskReportEmailDelivery)
      .where(eligibleDeliveryCondition(now))
      .orderBy(
        asc(protectionRiskReportEmailDelivery.createdAt),
        asc(protectionRiskReportEmailDelivery.id)
      )
      .limit(batchSize)
      .for("update", { skipLocked: true });

    const claimed = await Promise.all(
      candidates.map(async (candidate) => {
        const [row] = await transaction
          .update(protectionRiskReportEmailDelivery)
          .set({
            claimedAt: now,
            status: "retrying",
            updatedAt: now,
          })
          .where(
            and(
              eq(protectionRiskReportEmailDelivery.id, candidate.id),
              eligibleDeliveryCondition(now)
            )
          )
          .returning();
        return row;
      })
    );
    return claimed.filter((row): row is RiskReportEmailDeliveryRow =>
      Boolean(row)
    );
  });
};

export const deliverClaimedRiskReportEmail = async ({
  database = db,
  delivery,
  now = new Date(),
  sender,
}: {
  database?: typeof db;
  delivery: RiskReportEmailDeliveryRow;
  now?: Date;
  sender: EmailSender;
}): Promise<"failed" | "sent" | "retrying"> => {
  if (!delivery.claimedAt) {
    throw new Error(
      "Risk report email delivery must be claimed before sending"
    );
  }
  const attemptCount = delivery.attemptCount + 1;
  const firstAttemptAt = delivery.firstAttemptAt ?? now;

  try {
    await sender.send({
      html: delivery.htmlBody,
      recipientEmail: delivery.recipientEmail,
      subject: delivery.subject,
      text: delivery.textBody,
    });
    await database
      .update(protectionRiskReportEmailDelivery)
      .set({
        attemptCount,
        claimedAt: null,
        firstAttemptAt,
        lastAttemptAt: now,
        lastError: null,
        nextAttemptAt: now,
        status: "sent",
        updatedAt: now,
      })
      .where(
        and(
          eq(protectionRiskReportEmailDelivery.id, delivery.id),
          eq(protectionRiskReportEmailDelivery.claimedAt, delivery.claimedAt)
        )
      );
    return "sent";
  } catch (error) {
    const retryWindowExpired =
      now.getTime() - firstAttemptAt.getTime() >=
      EMAIL_DELIVERY_RETRY_WINDOW_MS;
    const decision =
      attemptCount >= EMAIL_DELIVERY_MAX_ATTEMPTS || retryWindowExpired
        ? { nextAttemptAt: null, status: "failed" as const }
        : getEmailRetryDecision({ attemptCount, firstAttemptAt, now });
    await database
      .update(protectionRiskReportEmailDelivery)
      .set({
        attemptCount,
        claimedAt: null,
        firstAttemptAt,
        lastAttemptAt: now,
        lastError: error instanceof Error ? error.message : "Email send failed",
        nextAttemptAt: decision.nextAttemptAt ?? now,
        status: decision.status,
        updatedAt: now,
      })
      .where(
        and(
          eq(protectionRiskReportEmailDelivery.id, delivery.id),
          eq(protectionRiskReportEmailDelivery.claimedAt, delivery.claimedAt)
        )
      );
    return decision.status;
  }
};

export const processRiskReportEmailDeliveries = async ({
  batchSize = EMAIL_DELIVERY_BATCH_SIZE,
  database = db,
  now = new Date(),
  sender,
}: {
  batchSize?: number;
  database?: typeof db;
  now?: Date;
  sender: EmailSender;
}): Promise<{
  claimed: number;
  failed: number;
  retrying: number;
  sent: number;
}> => {
  const deliveries = await claimRiskReportEmailDeliveries({
    batchSize,
    database,
    now,
  });
  const results = await Promise.all(
    deliveries.map((delivery) =>
      deliverClaimedRiskReportEmail({ database, delivery, now, sender })
    )
  );
  return {
    claimed: results.length,
    failed: results.filter((result) => result === "failed").length,
    retrying: results.filter((result) => result === "retrying").length,
    sent: results.filter((result) => result === "sent").length,
  };
};
