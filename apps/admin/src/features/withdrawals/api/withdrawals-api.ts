import { useMutation, useQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";

import type { WithdrawalStatus } from "../types";

export const adminWithdrawalsQueryOptions = (status?: WithdrawalStatus) =>
  orpc.wallet.admin.listWithdrawals.queryOptions({
    input: status ? { status } : undefined,
  });

const invalidateWithdrawals = (): Promise<void> =>
  queryClient.invalidateQueries({
    queryKey: orpc.wallet.admin.listWithdrawals.key(),
  });

export const useAdminWithdrawals = (status?: WithdrawalStatus) =>
  useQuery(adminWithdrawalsQueryOptions(status));

export const useApproveWithdrawal = () =>
  useMutation({
    ...orpc.wallet.admin.approveWithdrawal.mutationOptions(),
    onSuccess: invalidateWithdrawals,
  });

export const useRejectWithdrawal = () =>
  useMutation({
    ...orpc.wallet.admin.rejectWithdrawal.mutationOptions(),
    onSuccess: invalidateWithdrawals,
  });

export const useMarkWithdrawalPaid = () =>
  useMutation({
    ...orpc.wallet.admin.markWithdrawalPaid.mutationOptions(),
    onSuccess: invalidateWithdrawals,
  });
