import { expect, it } from "vitest";

import type { SellerApplication } from "./types";
import {
  applySellerApplicationDecision,
  maskBankAccount,
  resubmitSellerApplication,
} from "./workflow";

const pendingApplication: SellerApplication = {
  applicantName: "A",
  bankAccount: {
    accountName: "A",
    accountNumber: "123456789",
    bankName: "B",
  },
  email: "a@b.c",
  id: "app-1",
  phone: "123",
  revisionCount: 0,
  sellerAgreementVersion: "v1",
  status: "PENDING_REVIEW",
  storefrontName: "Store",
  submittedAt: "2026-01-01T00:00:00Z",
};

it("approves pending applications without a reason", () => {
  const approved = applySellerApplicationDecision(
    pendingApplication,
    "APPROVED"
  );
  expect(approved.status).toBe("APPROVED");
  expect(approved.reviewReason).toBeUndefined();
});

it("requires a reason when requesting changes", () => {
  expect(() =>
    applySellerApplicationDecision(pendingApplication, "CHANGES_REQUESTED")
  ).toThrow("A reason is required");
});

it("masks bank account numbers", () => {
  expect(maskBankAccount("1234567890")).toBe("**** 7890");
});

it("allows resubmitting an application with requested changes", () => {
  const changesRequested: SellerApplication = {
    ...pendingApplication,
    reviewReason: "Fix phone number",
    status: "CHANGES_REQUESTED",
  };

  const resubmitted = resubmitSellerApplication(changesRequested);
  expect(resubmitted.status).toBe("PENDING_REVIEW");
  expect(resubmitted.revisionCount).toBe(1);
  expect(resubmitted.reviewReason).toBeUndefined();
});
