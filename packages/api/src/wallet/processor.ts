import { db } from "@avin/db";
import { depositRequest, sepayPaymentEvent } from "@avin/db/schema/wallet";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";

import { isAvinPaymentCode } from "./sepay";
import type { NormalizedSePayEvent } from "./sepay";
import { creditDepositForEvent } from "./service";

export interface SePayProcessorConfiguration {
  receivingAccountNumber: string;
}

export interface ProcessedSePayEvent {
  eventId: string;
  status: "CREDITED" | "DUPLICATE" | "UNMATCHED";
  transactionReference?: string;
}

export interface DepositRequestMatch {
  amount: number;
  id: string;
  status: "CREDITED" | "PENDING";
}

export const matchSePayDeposit = ({
  event,
  receivingAccountNumber,
  request,
}: {
  event: NormalizedSePayEvent;
  receivingAccountNumber: string;
  request: DepositRequestMatch | null;
}): { reason: string; requestId?: string } => {
  if (event.accountNumber !== receivingAccountNumber) {
    return { reason: "receiving_account_mismatch" };
  }
  if (event.transferType !== "in") {
    return { reason: "not_an_incoming_transfer" };
  }
  if (event.currency !== "VND") {
    return { reason: "currency_mismatch" };
  }
  if (!event.paymentCode || !isAvinPaymentCode(event.paymentCode)) {
    return { reason: "payment_code_invalid_or_missing" };
  }
  if (!request) {
    return { reason: "deposit_request_not_found" };
  }
  if (request.status === "CREDITED") {
    return {
      reason: "deposit_request_already_credited",
      requestId: request.id,
    };
  }
  if (event.amount !== request.amount) {
    return { reason: "amount_mismatch", requestId: request.id };
  }
  return { reason: "matched", requestId: request.id };
};

const findExistingEvent = async (
  executor: Parameters<Parameters<typeof db.transaction>[0]>[0],
  event: NormalizedSePayEvent
) => {
  const [byProvider] = await executor
    .select()
    .from(sepayPaymentEvent)
    .where(
      and(
        eq(sepayPaymentEvent.source, event.source),
        eq(sepayPaymentEvent.providerEventId, event.providerEventId)
      )
    )
    .for("update")
    .limit(1);
  if (byProvider) {
    return byProvider;
  }

  if (!event.bankReference) {
    return undefined;
  }

  const [byBankReference] = await executor
    .select()
    .from(sepayPaymentEvent)
    .where(eq(sepayPaymentEvent.bankReference, event.bankReference))
    .for("update")
    .limit(1);
  return byBankReference;
};

const getDepositMatchResult = async (
  executor: Parameters<Parameters<typeof db.transaction>[0]>[0],
  event: NormalizedSePayEvent,
  configuration: SePayProcessorConfiguration
): Promise<{ reason: string; requestId?: string }> => {
  if (!event.paymentCode || !isAvinPaymentCode(event.paymentCode)) {
    return matchSePayDeposit({
      event,
      receivingAccountNumber: configuration.receivingAccountNumber,
      request: null,
    });
  }

  const [request] = await executor
    .select({
      amount: depositRequest.amount,
      id: depositRequest.id,
      status: depositRequest.status,
    })
    .from(depositRequest)
    .where(eq(depositRequest.paymentCode, event.paymentCode))
    .for("update")
    .limit(1);

  return matchSePayDeposit({
    event,
    receivingAccountNumber: configuration.receivingAccountNumber,
    request: request ?? null,
  });
};

const insertEvent = async (
  executor: Parameters<Parameters<typeof db.transaction>[0]>[0],
  event: NormalizedSePayEvent
) => {
  const [stored] = await executor
    .insert(sepayPaymentEvent)
    .values({
      accountNumber: event.accountNumber,
      amount: event.amount,
      bankReference: event.bankReference,
      content: event.content,
      currency: event.currency,
      gateway: event.gateway,
      paymentCode: event.paymentCode,
      providerEventId: event.providerEventId,
      rawPayload: event.rawPayload,
      rawBody: event.rawBody ?? JSON.stringify(event.rawPayload),
      source: event.source,
      transactionAt: event.transactionAt,
      transferType: event.transferType,
    })
    .onConflictDoNothing()
    .returning();

  return stored;
};

export const processSePayEvent = (
  event: NormalizedSePayEvent,
  configuration: SePayProcessorConfiguration,
  now = new Date(),
  database = db
): Promise<ProcessedSePayEvent> =>
  database.transaction(async (transaction) => {
    const existing = await findExistingEvent(transaction, event);
    if (existing) {
      return {
        eventId: existing.id,
        status: "DUPLICATE" as const,
      };
    }

    const stored = await insertEvent(transaction, event);
    if (!stored) {
      const duplicate = await findExistingEvent(transaction, event);
      if (!duplicate) {
        throw new Error("SePay event conflict was not recoverable");
      }
      return {
        eventId: duplicate.id,
        status: "DUPLICATE" as const,
      };
    }

    const match = await getDepositMatchResult(
      transaction,
      event,
      configuration
    );
    if (match.reason !== "matched" || !match.requestId) {
      await transaction
        .update(sepayPaymentEvent)
        .set({
          failureReason: match.reason,
          processedAt: now,
          status: "UNMATCHED",
        })
        .where(eq(sepayPaymentEvent.id, stored.id));

      return {
        eventId: stored.id,
        status: "UNMATCHED" as const,
      };
    }

    const credit = await creditDepositForEvent(
      transaction,
      event,
      match.requestId
    );
    await transaction
      .update(sepayPaymentEvent)
      .set({
        depositRequestId: match.requestId,
        ledgerTransactionId: credit.transactionId,
        processedAt: now,
        status: "CREDITED",
      })
      .where(eq(sepayPaymentEvent.id, stored.id));

    return {
      eventId: stored.id,
      status: "CREDITED" as const,
      transactionReference: credit.transactionReference,
    };
  });

export const reconcileSePayEvent = ({
  adminUserId,
  database = db,
  depositRequestId,
  eventId,
  receivingAccountNumber,
}: {
  adminUserId: string;
  database?: typeof db;
  depositRequestId: string;
  eventId: string;
  receivingAccountNumber: string;
}): Promise<ProcessedSePayEvent> =>
  database.transaction(async (transaction) => {
    const [stored] = await transaction
      .select()
      .from(sepayPaymentEvent)
      .where(eq(sepayPaymentEvent.id, eventId))
      .for("update")
      .limit(1);

    if (!stored) {
      throw new ORPCError("NOT_FOUND", {
        message: "Giao dịch SePay không tồn tại.",
      });
    }
    if (stored.status === "CREDITED" || stored.status === "RECONCILED") {
      throw new ORPCError("CONFLICT", {
        message: "Giao dịch SePay đã được ghi nhận trước đó.",
      });
    }
    if (
      stored.accountNumber !== receivingAccountNumber ||
      stored.transferType !== "in" ||
      stored.currency !== "VND" ||
      stored.amount <= 0
    ) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Chỉ có thể đối soát giao dịch tiền vào VND.",
      });
    }

    const event: NormalizedSePayEvent = {
      accountNumber: stored.accountNumber,
      amount: stored.amount,
      bankReference: stored.bankReference,
      content: stored.content,
      currency: stored.currency,
      gateway: stored.gateway,
      paymentCode: stored.paymentCode,
      providerEventId: stored.providerEventId,
      rawPayload: stored.rawPayload,
      rawBody: stored.rawBody,
      source: stored.source,
      transactionAt: stored.transactionAt,
      transferType: stored.transferType,
    };
    const credit = await creditDepositForEvent(
      transaction,
      event,
      depositRequestId
    );
    await transaction
      .update(sepayPaymentEvent)
      .set({
        depositRequestId,
        failureReason: null,
        ledgerTransactionId: credit.transactionId,
        processedAt: new Date(),
        reconciledByUserId: adminUserId,
        status: "RECONCILED",
      })
      .where(eq(sepayPaymentEvent.id, eventId));

    return {
      eventId,
      status: "CREDITED" as const,
      transactionReference: credit.transactionReference,
    };
  });
