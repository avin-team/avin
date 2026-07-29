import { describe, expect, it } from "vitest";

import type { SellerApplication } from "./types";
import {
  applySellerApplicationDecision,
  maskBankAccount,
  resubmitSellerApplication,
} from "./workflow";

const pendingApplication: SellerApplication = {
  applicantName: "Nguyen An",
  bankAccount: {
    accountName: "NGUYEN AN",
    accountNumber: "0123456789",
    bankName: "Vietcombank",
  },
  email: "an@example.com",
  id: "app_001",
  phone: "+84 912 345 678",
  revisionCount: 0,
  sellerAgreementVersion: "2026.07",
  status: "PENDING_REVIEW",
  storefrontName: "An Digital",
  submittedAt: "2026-07-28T09:30:00.000Z",
};

it("approves a pending SellerApplication without a reason", () => {
  const result = applySellerApplicationDecision(pendingApplication, "APPROVED");

  expect(result.status).toBe("APPROVED");
  expect(result.reviewReason).toBeUndefined();
});

it("requires a reason for CHANGES_REQUESTED and REJECTED", () => {
  expect(() =>
    applySellerApplicationDecision(pendingApplication, "CHANGES_REQUESTED")
  ).toThrow("A reason is required");

  expect(() =>
    applySellerApplicationDecision(pendingApplication, "REJECTED", "   ")
  ).toThrow("A reason is required");
});

it("does not allow a terminal SellerApplication to be decided again", () => {
  expect(() =>
    applySellerApplicationDecision(
      { ...pendingApplication, status: "APPROVED" },
      "REJECTED",
      "Duplicate review"
    )
  ).toThrow("Only pending applications can be decided");
});

it("resubmits a changes-requested application for review", () => {
  const result = resubmitSellerApplication({
    ...pendingApplication,
    reviewReason: "Please update your bank details",
    revisionCount: 1,
    status: "CHANGES_REQUESTED",
  });

  expect(result.status).toBe("PENDING_REVIEW");
  expect(result.reviewReason).toBeUndefined();
  expect(result.revisionCount).toBe(2);
});

it("masks a bank account while preserving the last four digits", () => {
  expect(maskBankAccount("0123456789")).toBe("**** 6789");
});
