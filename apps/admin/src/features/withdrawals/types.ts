export type WithdrawalStatus =
  | "APPROVED"
  | "CANCELLED"
  | "PAID"
  | "REJECTED"
  | "REQUESTED";

export interface AdminWithdrawal {
  readonly amount: number;
  readonly bankAccount: {
    readonly accountName: string;
    readonly accountNumber: string;
    readonly bankName: string;
  };
  readonly createdAt: string;
  readonly id: string;
  readonly paymentReference: string | null;
  readonly sellerEmail: string;
  readonly sellerId: string;
  readonly sellerImage: string | null;
  readonly sellerName: string;
  readonly status: WithdrawalStatus;
}

export type WithdrawalAction = "APPROVE" | "MARK_PAID" | "REJECT";
