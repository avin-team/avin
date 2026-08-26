import type { ProviderApplicationStatus } from "@avin/api/protection/provider-application";
import { useMutation, useQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";

export type ProviderApplicationStatusFilter = "ALL" | ProviderApplicationStatus;

export const providerApplicationsQueryOptions = (params?: {
  search?: string;
  status?: ProviderApplicationStatusFilter;
}) =>
  orpc.protection.adminProviderApplications.list.queryOptions({
    input: {
      search: params?.search,
      status: params?.status === "ALL" ? undefined : params?.status,
    },
  });

export const providerApplicationDetailQueryOptions = (id: string) =>
  orpc.protection.adminProviderApplications.get.queryOptions({
    input: { id },
  });

export const invalidateProviderApplications = async (): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: orpc.protection.adminProviderApplications.list.key(),
    }),
    queryClient.invalidateQueries({
      queryKey: orpc.protection.adminProviderApplications.get.key(),
    }),
  ]);
};

export const useAdminProviderApplications = (params?: {
  search?: string;
  status?: ProviderApplicationStatusFilter;
}) => useQuery(providerApplicationsQueryOptions(params));

export const useAdminProviderApplication = (id: string) =>
  useQuery(providerApplicationDetailQueryOptions(id));

export const useAdminDecideProviderApplication = () =>
  useMutation({
    ...orpc.protection.adminProviderApplications.decide.mutationOptions(),
    onSuccess: invalidateProviderApplications,
  });
