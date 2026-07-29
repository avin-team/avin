import { useSyncExternalStore } from "react";

import type { SellerApplication, SellerApplicationDecision } from "../types";
import {
  applySellerApplicationDecision,
  resubmitSellerApplication,
} from "../workflow";

const seedApplications: SellerApplication[] = [
  {
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
  },
  {
    applicantName: "Tran Minh",
    bankAccount: {
      accountName: "TRAN MINH",
      accountNumber: "1029384756",
      bankName: "Techcombank",
    },
    email: "minh@example.com",
    id: "app_002",
    phone: "+84 903 111 222",
    revisionCount: 0,
    sellerAgreementVersion: "2026.07",
    status: "PENDING_REVIEW",
    storefrontName: "Minh Setup Lab",
    submittedAt: "2026-07-27T14:15:00.000Z",
  },
  {
    applicantName: "Le Ha",
    bankAccount: {
      accountName: "LE HA",
      accountNumber: "9988776655",
      bankName: "ACB",
    },
    email: "ha@example.com",
    id: "app_003",
    phone: "+84 988 333 444",
    reviewReason: "Please upload a clearer bank account confirmation.",
    revisionCount: 1,
    sellerAgreementVersion: "2026.06",
    status: "CHANGES_REQUESTED",
    storefrontName: "Ha Creative",
    submittedAt: "2026-07-25T11:05:00.000Z",
  },
  {
    applicantName: "Pham Duc",
    bankAccount: {
      accountName: "PHAM DUC",
      accountNumber: "2233445566",
      bankName: "MB Bank",
    },
    email: "duc@example.com",
    id: "app_004",
    phone: "+84 977 555 666",
    revisionCount: 0,
    sellerAgreementVersion: "2026.06",
    status: "APPROVED",
    storefrontName: "Duc Courses",
    submittedAt: "2026-07-24T08:45:00.000Z",
  },
  {
    applicantName: "Vo Linh",
    bankAccount: {
      accountName: "VO LINH",
      accountNumber: "5566778899",
      bankName: "BIDV",
    },
    email: "linh@example.com",
    id: "app_005",
    phone: "+84 901 777 888",
    reviewReason: "The submitted information could not be verified.",
    revisionCount: 0,
    sellerAgreementVersion: "2026.05",
    status: "REJECTED",
    storefrontName: "Linh Services",
    submittedAt: "2026-07-22T16:20:00.000Z",
  },
];

let applications = seedApplications;
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export function listSellerApplications(): readonly SellerApplication[] {
  return applications;
}

export function getSellerApplication(
  applicationId: string
): SellerApplication | undefined {
  return applications.find((application) => application.id === applicationId);
}

export function subscribeToSellerApplications(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSellerApplications(): readonly SellerApplication[] {
  return useSyncExternalStore(
    subscribeToSellerApplications,
    listSellerApplications,
    listSellerApplications
  );
}

export function decideSellerApplication(
  applicationId: string,
  decision: SellerApplicationDecision,
  reason?: string
): SellerApplication {
  const application = getRequiredApplication(applicationId);
  const updatedApplication = applySellerApplicationDecision(
    application,
    decision,
    reason
  );
  replaceApplication(updatedApplication);
  return updatedApplication;
}

export function resubmitSellerApplicationForReview(
  applicationId: string
): SellerApplication {
  const updatedApplication = resubmitSellerApplication(
    getRequiredApplication(applicationId)
  );
  replaceApplication(updatedApplication);
  return updatedApplication;
}

function getRequiredApplication(applicationId: string): SellerApplication {
  const application = getSellerApplication(applicationId);
  if (!application) {
    throw new Error("SellerApplication not found");
  }
  return application;
}

function replaceApplication(updatedApplication: SellerApplication) {
  applications = applications.map((application) =>
    application.id === updatedApplication.id ? updatedApplication : application
  );
  emitChange();
}
