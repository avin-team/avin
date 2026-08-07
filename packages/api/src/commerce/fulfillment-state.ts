import type {
  OrderItemStatus,
  WarrantyPolicySnapshot,
} from "@avin/db/schema/commerce";

import type { DisputeEvidenceInput } from "./dispute-contracts";

const MILLISECONDS_PER_MINUTE = 60_000;
const MILLISECONDS_PER_HOUR = 60 * MILLISECONDS_PER_MINUTE;

export const DELIVERY_REVIEW_WINDOW_HOURS = 48;

export const DELIVERY_REVIEW_WINDOW_MS =
  DELIVERY_REVIEW_WINDOW_HOURS * MILLISECONDS_PER_HOUR;

export type OrderItemTransitionCommand =
  | { type: "CANCEL_BY_BUYER" }
  | { reason: string; type: "CANCEL_BY_SELLER" }
  | { reason: string; type: "CANCEL_BY_SYSTEM" }
  | { type: "CONFIRM_DELIVERY" }
  | { type: "EXPIRE_DELIVERY_REVIEW" }
  | { type: "EXPIRE_WARRANTY" }
  | {
      evidence?: DisputeEvidenceInput[];
      reason: string;
      type: "OPEN_DISPUTE";
    }
  | { deliveryNote: string; type: "SUBMIT_DELIVERY" }
  | { type: "START_FULFILLMENT" };

export interface OrderItemTransitionInput {
  command: OrderItemTransitionCommand;
  currentStatus: OrderItemStatus;
  deliveryReviewDeadlineAt?: Date;
  now: Date;
  processingDeadlineAt?: Date;
  warrantyPolicy?: WarrantyPolicySnapshot;
  warrantyDurationHours?: number;
  warrantyExpiresAt?: Date;
}

export interface OrderItemTransitionResult {
  deliveredAt?: Date;
  deliveryReviewDeadlineAt?: Date;
  effectiveAt: Date;
  newStatus: OrderItemStatus;
  oldStatus: OrderItemStatus;
  warrantyExpiresAt?: Date;
  warrantyStartedAt?: Date;
}

export class InvalidOrderItemTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidOrderItemTransitionError";
  }
}

const addHours = (date: Date, hours: number): Date =>
  new Date(date.getTime() + hours * MILLISECONDS_PER_HOUR);

const baseTransition = (
  input: OrderItemTransitionInput
): Pick<OrderItemTransitionResult, "effectiveAt" | "oldStatus"> => ({
  effectiveAt: input.now,
  oldStatus: input.currentStatus,
});

const assertStatus = (
  input: OrderItemTransitionInput,
  expectedStatus: OrderItemStatus,
  message: string
): void => {
  if (input.currentStatus !== expectedStatus) {
    throw new InvalidOrderItemTransitionError(message);
  }
};

const assertPositiveWarrantyDuration = (hours: number | undefined): number => {
  if (!hours || hours <= 0) {
    throw new InvalidOrderItemTransitionError(
      "Warranty duration must be positive"
    );
  }

  return hours;
};

const hasNoWarranty = (policy: WarrantyPolicySnapshot | undefined): boolean => {
  if (!policy || !("kind" in policy)) {
    return false;
  }
  return policy.kind === "NO_WARRANTY";
};

const getWarrantyDuration = (
  input: OrderItemTransitionInput
): number | null => {
  if (input.warrantyPolicy) {
    if (hasNoWarranty(input.warrantyPolicy)) {
      return null;
    }
    if ("kind" in input.warrantyPolicy) {
      return input.warrantyPolicy.kind === "TIMED"
        ? input.warrantyPolicy.durationHours
        : null;
    }
    return input.warrantyPolicy.durationHours;
  }
  return assertPositiveWarrantyDuration(input.warrantyDurationHours);
};

const assertReason = (reason: string, message: string): string => {
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    throw new InvalidOrderItemTransitionError(message);
  }

  return trimmedReason;
};

const startFulfillment = (
  input: OrderItemTransitionInput
): OrderItemTransitionResult => {
  assertStatus(
    input,
    "AWAITING_SELLER",
    "OrderItem must be AWAITING_SELLER before fulfillment starts"
  );
  return { ...baseTransition(input), newStatus: "IN_PROGRESS" };
};

const submitDelivery = (
  input: OrderItemTransitionInput,
  deliveryNote: string
): OrderItemTransitionResult => {
  assertStatus(
    input,
    "IN_PROGRESS",
    "OrderItem must be IN_PROGRESS before delivery"
  );
  if (!deliveryNote.trim()) {
    throw new InvalidOrderItemTransitionError(
      "Delivery submission requires a note"
    );
  }

  const deliveryReviewDeadlineAt = new Date(
    input.now.getTime() + DELIVERY_REVIEW_WINDOW_MS
  );
  return {
    ...baseTransition(input),
    deliveredAt: input.now,
    deliveryReviewDeadlineAt,
    newStatus: "DELIVERED",
  };
};

const confirmDelivery = (
  input: OrderItemTransitionInput
): OrderItemTransitionResult => {
  assertStatus(
    input,
    "DELIVERED",
    "OrderItem must be DELIVERED before Buyer confirmation"
  );
  if (!input.deliveryReviewDeadlineAt) {
    throw new InvalidOrderItemTransitionError(
      "Delivery review deadline is missing"
    );
  }
  if (input.now > input.deliveryReviewDeadlineAt) {
    throw new InvalidOrderItemTransitionError(
      "Delivery review window has expired"
    );
  }

  const warrantyDuration = getWarrantyDuration(input);
  if (warrantyDuration === null) {
    return { ...baseTransition(input), newStatus: "CLOSED" };
  }
  return {
    ...baseTransition(input),
    newStatus: "IN_WARRANTY",
    warrantyExpiresAt: addHours(input.now, warrantyDuration),
    warrantyStartedAt: input.now,
  };
};

const expireDeliveryReview = (
  input: OrderItemTransitionInput
): OrderItemTransitionResult => {
  assertStatus(
    input,
    "DELIVERED",
    "OrderItem must be DELIVERED before the review timeout"
  );
  if (
    !input.deliveryReviewDeadlineAt ||
    input.now < input.deliveryReviewDeadlineAt
  ) {
    throw new InvalidOrderItemTransitionError(
      "Delivery review deadline has not expired"
    );
  }

  const warrantyDuration = getWarrantyDuration(input);
  if (warrantyDuration === null) {
    return {
      ...baseTransition(input),
      effectiveAt: input.deliveryReviewDeadlineAt,
      newStatus: "CLOSED",
    };
  }
  return {
    ...baseTransition(input),
    effectiveAt: input.deliveryReviewDeadlineAt,
    newStatus: "IN_WARRANTY",
    warrantyExpiresAt: addHours(
      input.deliveryReviewDeadlineAt,
      warrantyDuration
    ),
    warrantyStartedAt: input.deliveryReviewDeadlineAt,
  };
};

const expireWarranty = (
  input: OrderItemTransitionInput
): OrderItemTransitionResult => {
  assertStatus(
    input,
    "IN_WARRANTY",
    "OrderItem must be IN_WARRANTY before warranty expiry"
  );
  if (!input.warrantyExpiresAt || input.now < input.warrantyExpiresAt) {
    throw new InvalidOrderItemTransitionError(
      "Warranty deadline has not expired"
    );
  }

  return {
    ...baseTransition(input),
    effectiveAt: input.warrantyExpiresAt,
    newStatus: "CLOSED",
  };
};

const cancelByBuyer = (
  input: OrderItemTransitionInput
): OrderItemTransitionResult => {
  assertStatus(
    input,
    "AWAITING_SELLER",
    "Buyer can cancel only while awaiting Seller"
  );
  return { ...baseTransition(input), newStatus: "CANCELLED" };
};

const cancelBySeller = (
  input: OrderItemTransitionInput,
  reason: string
): OrderItemTransitionResult => {
  if (
    input.currentStatus !== "AWAITING_SELLER" &&
    input.currentStatus !== "IN_PROGRESS"
  ) {
    throw new InvalidOrderItemTransitionError(
      "Seller can cancel only before delivery"
    );
  }
  assertReason(reason, "Seller cancellation requires a reason");
  return { ...baseTransition(input), newStatus: "CANCELLED" };
};

const cancelBySystem = (
  input: OrderItemTransitionInput,
  reason: string
): OrderItemTransitionResult => {
  if (
    input.currentStatus !== "AWAITING_SELLER" &&
    input.currentStatus !== "IN_PROGRESS"
  ) {
    throw new InvalidOrderItemTransitionError(
      "System can cancel only before delivery"
    );
  }
  assertReason(reason, "System cancellation requires a reason");
  return { ...baseTransition(input), newStatus: "CANCELLED" };
};

const openDispute = (
  input: OrderItemTransitionInput,
  reason: string
): OrderItemTransitionResult => {
  const isLateDeliverySource =
    input.currentStatus === "AWAITING_SELLER" ||
    input.currentStatus === "IN_PROGRESS";
  if (isLateDeliverySource) {
    if (!input.processingDeadlineAt || input.now < input.processingDeadlineAt) {
      throw new InvalidOrderItemTransitionError(
        "Processing Expectation has not expired"
      );
    }
  } else if (input.currentStatus === "DELIVERED") {
    if (
      !input.deliveryReviewDeadlineAt ||
      input.now > input.deliveryReviewDeadlineAt
    ) {
      throw new InvalidOrderItemTransitionError(
        "Delivery review window has expired"
      );
    }
  } else if (input.currentStatus !== "IN_WARRANTY") {
    throw new InvalidOrderItemTransitionError(
      "OrderItem is not eligible for a Dispute"
    );
  } else if (input.warrantyExpiresAt && input.now >= input.warrantyExpiresAt) {
    throw new InvalidOrderItemTransitionError("Warranty period has expired");
  }

  assertReason(reason, "Dispute requires a reason");
  return { ...baseTransition(input), newStatus: "DISPUTED" };
};

export const decideOrderItemTransition = (
  input: OrderItemTransitionInput
): OrderItemTransitionResult => {
  switch (input.command.type) {
    case "CANCEL_BY_BUYER": {
      return cancelByBuyer(input);
    }
    case "CANCEL_BY_SELLER": {
      return cancelBySeller(input, input.command.reason);
    }
    case "CANCEL_BY_SYSTEM": {
      return cancelBySystem(input, input.command.reason);
    }
    case "CONFIRM_DELIVERY": {
      return confirmDelivery(input);
    }
    case "EXPIRE_DELIVERY_REVIEW": {
      return expireDeliveryReview(input);
    }
    case "EXPIRE_WARRANTY": {
      return expireWarranty(input);
    }
    case "OPEN_DISPUTE": {
      return openDispute(input, input.command.reason);
    }
    case "START_FULFILLMENT": {
      return startFulfillment(input);
    }
    case "SUBMIT_DELIVERY": {
      return submitDelivery(input, input.command.deliveryNote);
    }
    default: {
      throw new InvalidOrderItemTransitionError(
        "Unsupported OrderItem command"
      );
    }
  }
};
