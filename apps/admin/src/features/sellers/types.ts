export type SellerEnforcementStatus = "ACTIVE" | "SUSPENDED" | "BANNED";
export type SellerEnforcementState = "CLEAR" | "SUSPENDED" | "BANNED";

export type SellerEnforcementReasonCode =
  | "FINANCIAL_RISK"
  | "FRAUD_RISK"
  | "FULFILLMENT_RISK"
  | "OTHER"
  | "POLICY_VIOLATION";

export type SellerEnforcementActionType =
  | "BAN"
  | "ESCALATE"
  | "EXPIRE"
  | "LIFT"
  | "OVERTURN"
  | "REASON_CORRECTED"
  | "SUSPEND";

export interface EnforcementRecord {
  readonly actionType?: SellerEnforcementActionType;
  readonly actorUserId?: string | null;
  readonly adminName?: string;
  readonly adminNote?: string | null;
  readonly createdAt: Date | string;
  readonly effectiveAt?: Date | string;
  readonly expiresAt?: Date | string | null;
  readonly id: string;
  readonly newState?: string;
  readonly newStatus?: SellerEnforcementStatus;
  readonly previousState?: string;
  readonly previousStatus?: SellerEnforcementStatus;
  readonly reason?: string;
  readonly reasonCode?: SellerEnforcementReasonCode;
  readonly sellerReason?: string;
}

export interface SellerWalletSummary {
  readonly availableBalanceVnd: number;
  readonly pendingEscrowBalanceVnd: number;
}

export type EnforcementRemediationStatus =
  | "COMPLETED"
  | "NEEDS_ATTENTION"
  | "PENDING"
  | "RUNNING";

export interface EnforcementRemediationItem {
  readonly attempts: number;
  readonly createdAt: Date | string;
  readonly id: string;
  readonly lastError: string | null;
  readonly orderItemId: string;
  readonly processedAt: Date | string | null;
  readonly remediationId: string;
  readonly status: "COMPLETED" | "FAILED" | "PENDING" | "RUNNING";
  readonly updatedAt: Date | string;
}

export interface EnforcementRemediation {
  readonly actionId: string;
  readonly createdAt: Date | string;
  readonly finishedAt: Date | string | null;
  readonly id: string;
  readonly lastError: string | null;
  readonly sellerId: string;
  readonly status: EnforcementRemediationStatus;
  readonly totalItems: number;
  readonly updatedAt: Date | string;
}

export type AppealStatus =
  | "OVERTURNED"
  | "SUBMITTED"
  | "SUPERSEDED"
  | "UNDER_REVIEW"
  | "UPHELD";

export interface AppealEvidence {
  readonly appealId: string;
  readonly byteSize: number;
  readonly contentType: string;
  readonly description: string;
  readonly fileName: string;
  readonly id: string;
  readonly storageKey: string;
  readonly submittedAt: Date | string;
  readonly submittedByUserId: string;
}

export interface EnforcementAppeal {
  readonly actionId: string;
  readonly adminNote: string | null;
  readonly createdAt: Date | string;
  readonly evidence?: readonly AppealEvidence[];
  readonly id: string;
  readonly outcomeReason: string | null;
  readonly reviewedAt: Date | string | null;
  readonly reviewerUserId: string | null;
  readonly sellerId: string;
  readonly sellerReason: string;
  readonly status: AppealStatus;
  readonly updatedAt: Date | string;
}

export interface Seller {
  readonly activeListingsCount: number;
  readonly applicantName: string;
  readonly averageRating: number;
  readonly completedOrdersCount: number;
  readonly email: string;
  readonly enforcementHistory: readonly EnforcementRecord[];
  readonly enforcementStatus: SellerEnforcementStatus;
  readonly id: string;
  readonly joinedAt: string;
  readonly phone: string;
  readonly ratingCount: number;
  readonly storefrontName: string;
  readonly wallet: SellerWalletSummary;
}
