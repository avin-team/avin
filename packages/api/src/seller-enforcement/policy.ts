import type { OrderItemStatus } from "@avin/db/schema/commerce";

export const sellerEnforcementStateValues = [
  "CLEAR",
  "SUSPENDED",
  "BANNED",
] as const;

export type SellerEnforcementState =
  (typeof sellerEnforcementStateValues)[number];

export const sellerEnforcementReasonCodeValues = [
  "FRAUD_RISK",
  "POLICY_VIOLATION",
  "FULFILLMENT_RISK",
  "FINANCIAL_RISK",
  "OTHER",
] as const;

export type SellerEnforcementReasonCode =
  (typeof sellerEnforcementReasonCodeValues)[number];

export interface SellerEnforcementSnapshot {
  expiresAt?: Date | null;
  state: SellerEnforcementState;
}

export type SellerEnforcementTransition =
  | "BAN"
  | "ESCALATE"
  | "LIFT"
  | "OVERTURN"
  | "SUSPEND";

export const getSellerEnforcementTransition = (
  currentState: SellerEnforcementState,
  nextState: Exclude<SellerEnforcementState, "CLEAR"> | "CLEAR"
): SellerEnforcementTransition => {
  if (currentState === nextState) {
    throw new Error(`Seller Enforcement is already ${currentState}`);
  }

  if (currentState === "CLEAR" && nextState === "SUSPENDED") {
    return "SUSPEND";
  }
  if (currentState === "CLEAR" && nextState === "BANNED") {
    return "BAN";
  }
  if (currentState === "SUSPENDED" && nextState === "CLEAR") {
    return "LIFT";
  }
  if (currentState === "SUSPENDED" && nextState === "BANNED") {
    return "ESCALATE";
  }
  if (currentState === "BANNED" && nextState === "CLEAR") {
    return "OVERTURN";
  }

  throw new Error(
    `Seller Enforcement cannot transition from ${currentState} to ${nextState}`
  );
};

export const isSellerEnforcementActive = (
  enforcement: SellerEnforcementSnapshot,
  now = new Date()
): boolean => {
  if (enforcement.state === "CLEAR") {
    return false;
  }

  if (enforcement.state === "BANNED") {
    return true;
  }

  return (
    enforcement.expiresAt === null ||
    enforcement.expiresAt === undefined ||
    enforcement.expiresAt > now
  );
};

export const shouldCancelBannedSellerItem = (
  status: OrderItemStatus,
  hasDispute: boolean
): boolean =>
  !hasDispute && (status === "AWAITING_SELLER" || status === "IN_PROGRESS");
