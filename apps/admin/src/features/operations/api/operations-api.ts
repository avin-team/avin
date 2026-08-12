import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";

export const OPERATIONS_PAGE_SIZE = 50;

export type ReconciliationStatus =
  | "CREDITED"
  | "RECEIVED"
  | "RECONCILED"
  | "UNMATCHED";
export type TransactionType =
  | "DEPOSIT"
  | "ESCROW_RELEASE"
  | "PLATFORM_COMMISSION"
  | "PURCHASE_HOLD"
  | "REFUND"
  | "REVERSAL"
  | "SELLER_WALLET_MIGRATION"
  | "WITHDRAWAL_PAID"
  | "WITHDRAWAL_REQUEST";
export type EmailDeliveryStatus = "failed" | "pending" | "retrying" | "sent";

interface OperationsPageInput {
  cursor?: string;
}

export const useOperationsReconciliation = ({
  cursor,
  status,
}: OperationsPageInput & { status?: ReconciliationStatus } = {}) =>
  useQuery(
    orpc.operations.reconciliation.queryOptions({
      input: { cursor, limit: OPERATIONS_PAGE_SIZE, status },
    })
  );

export const useOperationsTransactions = ({
  cursor,
  type,
}: OperationsPageInput & { type?: TransactionType } = {}) =>
  useQuery(
    orpc.operations.transactions.queryOptions({
      input: { cursor, limit: OPERATIONS_PAGE_SIZE, type },
    })
  );

export const useOperationsAuditLog = ({
  action,
  cursor,
  outcome,
}: OperationsPageInput & {
  action?: string;
  outcome?: "FAILURE" | "SUCCESS";
} = {}) =>
  useQuery(
    orpc.operations.auditLog.queryOptions({
      input: { action, cursor, limit: OPERATIONS_PAGE_SIZE, outcome },
    })
  );

export const useOperationsEmailDelivery = ({
  cursor,
  status,
}: OperationsPageInput & { status?: EmailDeliveryStatus } = {}) =>
  useQuery(
    orpc.operations.emailDelivery.queryOptions({
      input: { cursor, limit: OPERATIONS_PAGE_SIZE, status },
    })
  );

export const useOperationsOverviewAnalytics = (
  timeframe: "7d" | "30d" = "7d"
) =>
  useQuery(
    orpc.operations.overviewAnalytics.queryOptions({
      input: { timeframe },
    })
  );

export const useReconcileDeposit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    ...orpc.wallet.admin.reconcile.mutationOptions(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: orpc.operations.reconciliation.queryKey({
          input: { limit: OPERATIONS_PAGE_SIZE },
        }),
      });
    },
  });
};

export const useRetryEmailDelivery = () => {
  const queryClient = useQueryClient();
  return useMutation({
    ...orpc.operations.retryEmailDelivery.mutationOptions(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: orpc.operations.emailDelivery.queryKey({
          input: { limit: OPERATIONS_PAGE_SIZE },
        }),
      });
    },
  });
};
