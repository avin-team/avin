export type WithdrawalStatus = "PENDING" | "APPROVED" | "PAID" | "REJECTED";

export interface WithdrawalBankAccountSnapshot {
  readonly bankName: string;
  readonly accountName: string;
  readonly accountNumber: string;
}

export interface WithdrawalRequest {
  readonly id: string;
  readonly sellerId: string;
  readonly storefrontName: string;
  readonly applicantName: string;
  readonly amountVnd: number;
  readonly status: WithdrawalStatus;
  readonly requestedAt: string;
  readonly bankAccount: WithdrawalBankAccountSnapshot;
  readonly processedAt?: string;
  readonly bankTransactionRef?: string;
  readonly note?: string;
}
