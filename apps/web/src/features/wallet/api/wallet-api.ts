import { orpc } from "@/utils/orpc";

export const walletSummaryQueryOptions = () =>
  orpc.wallet.getSummary.queryOptions();

export const walletTransactionsQueryOptions = (cursor?: string) =>
  orpc.wallet.getTransactions.queryOptions({
    input: cursor ? { cursor } : {},
  });

export const depositStatusQueryOptions = (requestId: string) =>
  orpc.wallet.getDepositStatus.queryOptions({
    input: { requestId },
  });

export const createDepositRequestMutationOptions = () =>
  orpc.wallet.createDepositRequest.mutationOptions();
