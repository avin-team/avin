export const SELLER_APPLICATION_STATUSES = [
  "PENDING_REVIEW",
  "APPROVED",
  "CHANGES_REQUESTED",
  "REJECTED",
] as const;

export type SellerApplicationStatus =
  (typeof SELLER_APPLICATION_STATUSES)[number];

export type SellerApplicationDecision = Exclude<
  SellerApplicationStatus,
  "PENDING_REVIEW"
>;

export interface SellerApplication {
  id: string;
  applicantName: string;
  email: string;
  phone: string;
  storefrontName: string;
  submittedAt: string;
  status: SellerApplicationStatus;
  bankAccount: {
    accountName: string;
    accountNumber: string;
    bankName: string;
  };
  sellerAgreementVersion: string;
  revisionCount: number;
  reviewReason?: string;
}
