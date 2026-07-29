export type DisputeStatus =
  | "OPEN"
  | "UNDER_REVIEW"
  | "RESOLVED_REFUNDED"
  | "RESOLVED_RELEASED";

export type DisputeResolutionOutcome =
  | "RESOLVED_REFUNDED"
  | "RESOLVED_RELEASED";

export interface DisputeEvidence {
  readonly id: string;
  readonly submitterRole: "BUYER" | "SELLER";
  readonly fileName: string;
  readonly fileUrl: string;
  readonly description: string;
  readonly uploadedAt: string;
}

export interface DisputeChatMessage {
  readonly id: string;
  readonly senderRole: "BUYER" | "SELLER" | "ADMIN";
  readonly senderName: string;
  readonly content: string;
  readonly sentAt: string;
  readonly isRedacted?: boolean;
}

export interface DisputeOrderItemSnapshot {
  readonly id: string;
  readonly orderId: string;
  readonly listingTitle: string;
  readonly categoryName: string;
  readonly quantity: number;
  readonly unitPriceVnd: number;
  readonly totalAmountVnd: number;
  readonly buyerInputs: Record<string, string>;
  readonly warrantyPolicyTerms: string;
  readonly warrantyDurationHours: number;
}

export interface Dispute {
  readonly id: string;
  readonly orderItemId: string;
  readonly buyerName: string;
  readonly buyerEmail: string;
  readonly sellerStorefrontName: string;
  readonly sellerEmail: string;
  readonly status: DisputeStatus;
  readonly reason: string;
  readonly createdAt: string;
  readonly resolvedAt?: string;
  readonly resolutionNote?: string;
  readonly itemSnapshot: DisputeOrderItemSnapshot;
  readonly evidenceList: readonly DisputeEvidence[];
  readonly chatMessages: readonly DisputeChatMessage[];
}
