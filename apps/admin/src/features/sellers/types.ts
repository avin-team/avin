export type SellerEnforcementStatus = "ACTIVE" | "SUSPENDED" | "BANNED";

export interface EnforcementRecord {
  readonly id: string;
  readonly previousStatus: SellerEnforcementStatus;
  readonly newStatus: SellerEnforcementStatus;
  readonly reason: string;
  readonly createdAt: string;
  readonly adminName: string;
}

export interface SellerWalletSummary {
  readonly pendingEscrowBalanceVnd: number;
  readonly availableBalanceVnd: number;
}

export interface Seller {
  readonly id: string;
  readonly storefrontName: string;
  readonly applicantName: string;
  readonly email: string;
  readonly phone: string;
  readonly enforcementStatus: SellerEnforcementStatus;
  readonly averageRating: number;
  readonly ratingCount: number;
  readonly completedOrdersCount: number;
  readonly activeListingsCount: number;
  readonly joinedAt: string;
  readonly wallet: SellerWalletSummary;
  readonly enforcementHistory: readonly EnforcementRecord[];
}
