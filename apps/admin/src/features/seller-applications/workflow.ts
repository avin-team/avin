import type { SellerApplication, SellerApplicationDecision } from "./types";

export const applySellerApplicationDecision = (
  application: SellerApplication,
  decision: SellerApplicationDecision,
  reason?: string
): SellerApplication => {
  if (application.status !== "PENDING_REVIEW") {
    throw new Error("Only pending applications can be decided");
  }

  const normalizedReason = reason?.trim();
  if (decision !== "APPROVED" && !normalizedReason) {
    throw new Error("A reason is required");
  }

  return {
    ...application,
    reviewReason: decision === "APPROVED" ? undefined : normalizedReason,
    status: decision,
  };
};

export const resubmitSellerApplication = (
  application: SellerApplication
): SellerApplication => {
  if (application.status !== "CHANGES_REQUESTED") {
    throw new Error(
      "Only applications with requested changes can be resubmitted"
    );
  }

  return {
    ...application,
    reviewReason: undefined,
    revisionCount: application.revisionCount + 1,
    status: "PENDING_REVIEW",
  };
};

export const maskBankAccount = (accountNumber: string): string => {
  const visibleDigits = accountNumber.slice(-4);
  return `**** ${visibleDigits}`;
};
