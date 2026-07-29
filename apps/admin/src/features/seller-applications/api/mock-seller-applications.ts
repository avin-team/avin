import { useSyncExternalStore } from "react";

import type {
  SellerApplication,
  SellerApplicationDecision,
  SellerApplicationStatus,
} from "../types";
import {
  applySellerApplicationDecision,
  resubmitSellerApplication,
} from "../workflow";

const INITIAL_SELLER_APPLICATIONS: readonly SellerApplication[] = [
  {
    applicantName: "Trần Văn Nam",
    bankAccount: {
      accountName: "TRAN VAN NAM",
      accountNumber: "19034567890012",
      bankName: "Techcombank",
    },
    email: "nam.tran@example.com",
    id: "app_1001",
    phone: "0901234567",
    revisionCount: 0,
    sellerAgreementVersion: "v1.2",
    status: "PENDING_REVIEW",
    storefrontName: "Shop Tai Khoan Premium",
    submittedAt: "2026-03-28T09:30:00Z",
  },
  {
    applicantName: "Lê Thị Thu",
    bankAccount: {
      accountName: "LE THI THU",
      accountNumber: "0071000123456",
      bankName: "Vietcombank",
    },
    email: "thu.le@example.com",
    id: "app_1002",
    phone: "0912345678",
    reviewReason: "Ảnh CMND/CCCD bị mờ, vui lòng tải lại bản rõ nét hơn.",
    revisionCount: 1,
    sellerAgreementVersion: "v1.2",
    status: "CHANGES_REQUESTED",
    storefrontName: "Thu Digital Store",
    submittedAt: "2026-03-27T14:15:00Z",
  },
  {
    applicantName: "Phạm Minh Hoàng",
    bankAccount: {
      accountName: "PHAM MINH HOANG",
      accountNumber: "1012345678",
      bankName: "MBBank",
    },
    email: "hoang.pham@example.com",
    id: "app_1003",
    phone: "0987654321",
    revisionCount: 0,
    sellerAgreementVersion: "v1.2",
    status: "APPROVED",
    storefrontName: "Hoang Game Code",
    submittedAt: "2026-03-25T11:00:00Z",
  },
  {
    applicantName: "Nguyễn Quốc Anh",
    bankAccount: {
      accountName: "NGUYEN QUOC ANH",
      accountNumber: "999988887777",
      bankName: "VPBank",
    },
    email: "quocanh@example.com",
    id: "app_1004",
    phone: "0933445566",
    reviewReason: "Storefront nghi vấn bán tài khoản vi phạm bản quyền.",
    revisionCount: 0,
    sellerAgreementVersion: "v1.2",
    status: "REJECTED",
    storefrontName: "BlackHat Store",
    submittedAt: "2026-03-24T16:45:00Z",
  },
];

let applicationsState: readonly SellerApplication[] =
  INITIAL_SELLER_APPLICATIONS;

const listeners = new Set<() => void>();

const emitChange = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

export const subscribeToSellerApplications = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useSellerApplications = (): readonly SellerApplication[] =>
  useSyncExternalStore(
    subscribeToSellerApplications,
    () => applicationsState,
    () => INITIAL_SELLER_APPLICATIONS
  );

export const getSellerApplication = (
  applicationId: string
): SellerApplication | undefined =>
  applicationsState.find((application) => application.id === applicationId);

const getRequiredApplication = (applicationId: string): SellerApplication => {
  const application = getSellerApplication(applicationId);
  if (!application) {
    throw new Error("SellerApplication not found");
  }
  return application;
};

const replaceApplication = (updatedApplication: SellerApplication) => {
  applicationsState = applicationsState.map((application) =>
    application.id === updatedApplication.id ? updatedApplication : application
  );
  emitChange();
};

export const decideSellerApplication = (
  applicationId: string,
  decision: SellerApplicationDecision,
  reason?: string
): SellerApplication => {
  const application = getRequiredApplication(applicationId);
  const updatedApplication = applySellerApplicationDecision(
    application,
    decision,
    reason
  );
  replaceApplication(updatedApplication);
  return updatedApplication;
};

export const resubmitSellerApplicationForReview = (
  applicationId: string
): SellerApplication => {
  const updatedApplication = resubmitSellerApplication(
    getRequiredApplication(applicationId)
  );
  replaceApplication(updatedApplication);
  return updatedApplication;
};

export const getSellerApplicationsByStatus = (
  status: SellerApplicationStatus
): readonly SellerApplication[] =>
  applicationsState.filter((app) => app.status === status);
