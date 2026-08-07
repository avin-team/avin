import type { DisputeStatus, OrderItemStatus } from "@avin/db/schema/commerce";

export type DisputeResolutionOutcome =
  | "RESOLVED_REFUNDED"
  | "RESOLVED_RELEASED";

interface DisputeDecisionInput {
  disputeStatus: DisputeStatus;
  note: string;
  now: Date;
  orderItemStatus: OrderItemStatus;
  outcome: DisputeResolutionOutcome;
}

interface DisputeCancellationInput {
  disputeStatus: DisputeStatus;
  now: Date;
  orderItemStatus: OrderItemStatus;
  previousOrderItemStatus: OrderItemStatus;
  reason: string;
}

export interface DisputeDecisionResult {
  disputeStatus: DisputeResolutionOutcome;
  escrowHoldStatus: "REFUNDED" | "RELEASED";
  note: string;
  orderItemStatus: "CLOSED" | "REFUNDED";
  resolvedAt: Date;
}

export interface DisputeCancellationResult {
  cancelledAt: Date;
  disputeStatus: "CANCELLED";
  orderItemStatus: OrderItemStatus;
  reason: string;
}

const assertOpenDispute = (status: DisputeStatus): void => {
  if (status !== "OPEN") {
    throw new Error("Dispute is no longer open");
  }
};

const assertDisputedItem = (status: OrderItemStatus): void => {
  if (status !== "DISPUTED") {
    throw new Error("OrderItem must be DISPUTED");
  }
};

const normalizeReason = (reason: string, message: string): string => {
  const normalized = reason.trim();
  if (!normalized) {
    throw new Error(message);
  }
  return normalized;
};

export const resolveDisputeDecision = ({
  disputeStatus,
  note,
  now,
  orderItemStatus,
  outcome,
}: DisputeDecisionInput): DisputeDecisionResult => {
  assertOpenDispute(disputeStatus);
  assertDisputedItem(orderItemStatus);
  const normalizedNote = normalizeReason(
    note,
    "Dispute resolution requires a reason"
  );

  if (outcome === "RESOLVED_REFUNDED") {
    return {
      disputeStatus: outcome,
      escrowHoldStatus: "REFUNDED",
      note: normalizedNote,
      orderItemStatus: "REFUNDED",
      resolvedAt: now,
    };
  }

  return {
    disputeStatus: outcome,
    escrowHoldStatus: "RELEASED",
    note: normalizedNote,
    orderItemStatus: "CLOSED",
    resolvedAt: now,
  };
};

export const cancelDisputeDecision = ({
  disputeStatus,
  now,
  orderItemStatus,
  previousOrderItemStatus,
  reason,
}: DisputeCancellationInput): DisputeCancellationResult => {
  assertOpenDispute(disputeStatus);
  assertDisputedItem(orderItemStatus);

  if (previousOrderItemStatus === "DISPUTED") {
    throw new Error("Dispute previous status must be restorable");
  }

  return {
    cancelledAt: now,
    disputeStatus: "CANCELLED",
    orderItemStatus: previousOrderItemStatus,
    reason: normalizeReason(reason, "Dispute cancellation requires a reason"),
  };
};
