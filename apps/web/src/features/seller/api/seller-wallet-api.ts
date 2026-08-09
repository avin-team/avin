import { orpc } from "@/utils/orpc";

export const sellerWalletSummaryQueryOptions = () =>
  orpc.wallet.seller.getSummary.queryOptions();

export const sellerWithdrawalsQueryOptions = () =>
  orpc.wallet.seller.listWithdrawals.queryOptions();

export const sellerWithdrawalQueryKey = () =>
  orpc.wallet.seller.listWithdrawals.queryOptions().queryKey;
