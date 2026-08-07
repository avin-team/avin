export type DisputeStatus =
  | "OPEN"
  | "UNDER_REVIEW"
  | "CANCELLED"
  | "RESOLVED_REFUNDED"
  | "RESOLVED_RELEASED";

export type AdminApiDisputeStatus = Exclude<DisputeStatus, "UNDER_REVIEW">;

export type DisputeResolutionOutcome =
  | "RESOLVED_REFUNDED"
  | "RESOLVED_RELEASED";

export interface DisputeEvidence {
  readonly byteSize: number;
  readonly contentType: string;
  readonly submittedAt: string;
  readonly submittedLate: boolean;
  readonly storageKey: string;
  readonly id: string;
  readonly submitterRole: "BUYER" | "SELLER";
  readonly fileName: string;
  readonly description: string;
  readonly fileUrl?: string;
  readonly uploadedAt?: string;
}

export interface DisputeChatMessage {
  readonly attachments: readonly DisputeChatAttachment[];
  readonly id: string;
  readonly senderRole: "BUYER" | "SELLER" | "ADMIN";
  readonly senderName: string;
  readonly content: string;
  readonly sentAt: string;
  readonly isRedacted?: boolean;
}

export interface DisputeChatAttachment {
  readonly byteSize: number;
  readonly contentType: string;
  readonly fileName: string;
  readonly id: string;
}

export interface DisputeOrderItemSnapshot {
  readonly id: string;
  readonly orderId: string;
  readonly listingTitle: string;
  readonly categoryName: string;
  readonly quantity: number;
  readonly servicePackageDescription: string | null;
  readonly servicePackageName: string | null;
  readonly servicePackageScope: string | null;
  readonly unitPriceVnd: number;
  readonly totalAmountVnd: number;
  readonly buyerInputs: Record<string, string>;
  readonly warrantyPolicyTerms: string;
  readonly warrantyDurationHours: number;
}

export interface Dispute {
  readonly adminDecisionDeadlineAt?: string;
  readonly id: string;
  readonly orderItemId: string;
  readonly buyerName: string;
  readonly buyerEmail: string;
  readonly sellerStorefrontName: string;
  readonly sellerEmail: string;
  readonly status: DisputeStatus;
  readonly reason: string;
  readonly createdAt: string;
  readonly responseDeadlineAt: string;
  readonly resolvedAt?: string;
  readonly resolutionNote?: string;
  readonly itemSnapshot: DisputeOrderItemSnapshot;
  readonly evidenceList: readonly DisputeEvidence[];
  readonly chatMessages: readonly DisputeChatMessage[];
}
