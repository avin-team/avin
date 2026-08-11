import { db } from "@avin/db";
import { emailDelivery } from "@avin/db/schema/commerce";
import { ORPCError } from "@orpc/server";
import { and, asc, eq, isNull, lte, or } from "drizzle-orm";

export const EMAIL_DELIVERY_MAX_ATTEMPTS = 5;
export const EMAIL_DELIVERY_RETRY_WINDOW_MS = 24 * 60 * 60 * 1000;
export const EMAIL_DELIVERY_CLAIM_LEASE_MS = 5 * 60 * 1000;
export const EMAIL_DELIVERY_BATCH_SIZE = 10;

const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000];

export type EmailDeliveryRow = typeof emailDelivery.$inferSelect;

export interface EmailSender {
  send: (input: {
    html: string;
    recipientEmail: string;
    subject: string;
    text: string;
  }) => Promise<void>;
}

export interface EmailRetryDecision {
  nextAttemptAt: Date | null;
  status: "failed" | "retrying";
}

export const getEmailRetryDecision = ({
  attemptCount,
  firstAttemptAt,
  now,
}: {
  attemptCount: number;
  firstAttemptAt: Date;
  now: Date;
}): EmailRetryDecision => {
  const retryWindowExpired =
    now.getTime() - firstAttemptAt.getTime() >= EMAIL_DELIVERY_RETRY_WINDOW_MS;
  if (attemptCount >= EMAIL_DELIVERY_MAX_ATTEMPTS || retryWindowExpired) {
    return { nextAttemptAt: null, status: "failed" };
  }

  const delay =
    RETRY_DELAYS_MS[Math.min(attemptCount - 1, RETRY_DELAYS_MS.length - 1)] ??
    RETRY_DELAYS_MS.at(-1) ??
    60_000;
  return {
    nextAttemptAt: new Date(now.getTime() + delay),
    status: "retrying",
  };
};

const eligibleDeliveryCondition = (now: Date) =>
  and(
    or(
      eq(emailDelivery.status, "pending"),
      eq(emailDelivery.status, "retrying")
    ),
    lte(emailDelivery.nextAttemptAt, now),
    or(
      isNull(emailDelivery.claimedAt),
      lte(
        emailDelivery.claimedAt,
        new Date(now.getTime() - EMAIL_DELIVERY_CLAIM_LEASE_MS)
      )
    )
  );

export const claimEmailDeliveries = ({
  batchSize = EMAIL_DELIVERY_BATCH_SIZE,
  database = db,
  now = new Date(),
}: {
  batchSize?: number;
  database?: typeof db;
  now?: Date;
} = {}): Promise<EmailDeliveryRow[]> => {
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error("Email delivery batch size must be positive");
  }

  return database.transaction(async (transaction) => {
    const candidates = await transaction
      .select()
      .from(emailDelivery)
      .where(eligibleDeliveryCondition(now))
      .orderBy(asc(emailDelivery.createdAt), asc(emailDelivery.id))
      .limit(batchSize)
      .for("update", { skipLocked: true });

    const claimed = await Promise.all(
      candidates.map(async (candidate) => {
        const [row] = await transaction
          .update(emailDelivery)
          .set({
            claimedAt: now,
            status: "retrying",
            updatedAt: now,
          })
          .where(
            and(
              eq(emailDelivery.id, candidate.id),
              eligibleDeliveryCondition(now)
            )
          )
          .returning();
        return row;
      })
    );
    return claimed.filter((row): row is EmailDeliveryRow => Boolean(row));
  });
};

export const deliverClaimedEmail = async ({
  database = db,
  delivery,
  now = new Date(),
  sender,
}: {
  database?: typeof db;
  delivery: EmailDeliveryRow;
  now?: Date;
  sender: EmailSender;
}): Promise<"failed" | "sent" | "retrying"> => {
  const { claimedAt } = delivery;
  if (!claimedAt) {
    throw new Error("Email delivery must be claimed before sending");
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
      .update(emailDelivery)
      .set({
        attemptCount,
        claimedAt: null,
        firstAttemptAt,
        lastAttemptAt: now,
        lastError: null,
        nextAttemptAt: null,
        status: "sent",
        updatedAt: now,
      })
      .where(
        and(
          eq(emailDelivery.id, delivery.id),
          eq(emailDelivery.claimedAt, claimedAt)
        )
      );
    return "sent";
  } catch (error) {
    const decision = getEmailRetryDecision({
      attemptCount,
      firstAttemptAt,
      now,
    });
    await database
      .update(emailDelivery)
      .set({
        attemptCount,
        claimedAt: null,
        firstAttemptAt,
        lastAttemptAt: now,
        lastError: error instanceof Error ? error.message : "Email send failed",
        nextAttemptAt: decision.nextAttemptAt,
        status: decision.status,
        updatedAt: now,
      })
      .where(
        and(
          eq(emailDelivery.id, delivery.id),
          eq(emailDelivery.claimedAt, claimedAt)
        )
      );
    return decision.status;
  }
};

export const processEmailDeliveries = async ({
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
  sent: number;
  retrying: number;
}> => {
  const deliveries = await claimEmailDeliveries({
    batchSize,
    database,
    now,
  });
  const results = await Promise.all(
    deliveries.map((delivery) =>
      deliverClaimedEmail({ database, delivery, now, sender })
    )
  );

  return {
    claimed: results.length,
    failed: results.filter((result) => result === "failed").length,
    retrying: results.filter((result) => result === "retrying").length,
    sent: results.filter((result) => result === "sent").length,
  };
};

export const retryEmailDelivery = async ({
  database = db,
  deliveryId,
  now = new Date(),
}: {
  database?: typeof db;
  deliveryId: string;
  now?: Date;
}): Promise<EmailDeliveryRow> => {
  const [delivery] = await database
    .update(emailDelivery)
    .set({
      attemptCount: 0,
      claimedAt: null,
      firstAttemptAt: null,
      lastAttemptAt: null,
      lastError: null,
      nextAttemptAt: now,
      retryWindowStartedAt: now,
      status: "pending",
      updatedAt: now,
    })
    .where(
      and(eq(emailDelivery.id, deliveryId), eq(emailDelivery.status, "failed"))
    )
    .returning();
  if (!delivery) {
    throw new ORPCError("CONFLICT", {
      message: "Chỉ có thể retry Email Delivery đang ở trạng thái failed.",
    });
  }
  return delivery;
};

export const createResendEmailSender = ({
  apiKey,
  endpoint = "https://api.resend.com/emails",
  fetchImpl = fetch,
  from,
}: {
  apiKey: string;
  endpoint?: string;
  fetchImpl?: typeof fetch;
  from: string;
}): EmailSender => ({
  send: async ({ html, recipientEmail, subject, text }) => {
    const response = await fetchImpl(endpoint, {
      body: JSON.stringify({
        from,
        html,
        subject,
        text,
        to: [recipientEmail],
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    if (!response.ok) {
      throw new Error(`Email provider returned HTTP ${response.status}`);
    }
  },
});
