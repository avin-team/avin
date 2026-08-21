import type { AppRouterClient } from "@avin/api/router";
import { useMutation, useQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";

export type ProviderBond = Awaited<
  ReturnType<AppRouterClient["protection"]["adminProviderBonds"]["get"]>
>;
export type ProviderBondWithdrawal = Awaited<
  ReturnType<
    AppRouterClient["protection"]["adminProviderBondWithdrawals"]["get"]
  >
>;

const invalidateProviderBonds = async (): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: orpc.protection.adminProviderBonds.list.key(),
    }),
    queryClient.invalidateQueries({
      queryKey: orpc.protection.adminProviderBonds.get.key(),
    }),
    queryClient.invalidateQueries({
      queryKey: orpc.protection.adminProviderBondWithdrawals.list.key(),
    }),
    queryClient.invalidateQueries({
      queryKey: orpc.protection.adminProviderBondWithdrawals.get.key(),
    }),
    queryClient.invalidateQueries({
      queryKey: orpc.protection.providerWorkspace.key(),
    }),
    queryClient.invalidateQueries({
      queryKey: orpc.protection.publicProfile.key(),
    }),
  ]);
};

export const useAdminProviderBonds = () =>
  useQuery(orpc.protection.adminProviderBonds.list.queryOptions());

export const useRecordAdminProviderBondAdjustment = () =>
  useMutation({
    ...orpc.protection.adminProviderBonds.record.mutationOptions(),
    onSuccess: invalidateProviderBonds,
  });

export const useApproveAdminProviderBondAdjustment = () =>
  useMutation({
    ...orpc.protection.adminProviderBonds.approve.mutationOptions(),
    onSuccess: invalidateProviderBonds,
  });

export const usePublishAdminProviderBondLimit = () =>
  useMutation({
    ...orpc.protection.adminProviderBonds.publishLimit.mutationOptions(),
    onSuccess: invalidateProviderBonds,
  });

export const useAdminProviderBondWithdrawals = () =>
  useQuery(orpc.protection.adminProviderBondWithdrawals.list.queryOptions());

export const useRecordAdminProviderBondWithdrawal = () =>
  useMutation({
    ...orpc.protection.adminProviderBondWithdrawals.record.mutationOptions(),
    onSuccess: invalidateProviderBonds,
  });

export const useApproveAdminProviderBondWithdrawal = () =>
  useMutation({
    ...orpc.protection.adminProviderBondWithdrawals.approve.mutationOptions(),
    onSuccess: invalidateProviderBonds,
  });
