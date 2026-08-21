import type { ProviderApplicationStatus } from "@avin/api/protection/provider-application";
import { useMutation, useQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";

export type ProviderProfileRevisionStatusFilter =
  | "ALL"
  | ProviderApplicationStatus;

export const providerProfileRevisionsQueryOptions = (params?: {
  search?: string;
  status?: ProviderProfileRevisionStatusFilter;
}) =>
  orpc.protection.adminProviderProfileRevisions.list.queryOptions({
    input: {
      search: params?.search,
      status: params?.status === "ALL" ? undefined : params?.status,
    },
  });

export const providerProfileRevisionDetailQueryOptions = (id: string) =>
  orpc.protection.adminProviderProfileRevisions.get.queryOptions({
    input: { id },
  });

export const invalidateProviderProfileRevisions = async (): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: orpc.protection.adminProviderProfileRevisions.list.key(),
    }),
    queryClient.invalidateQueries({
      queryKey: orpc.protection.adminProviderProfileRevisions.get.key(),
    }),
  ]);
};

export const useAdminProviderProfileRevisions = (params?: {
  search?: string;
  status?: ProviderProfileRevisionStatusFilter;
}) => useQuery(providerProfileRevisionsQueryOptions(params));

export const useAdminProviderProfileRevision = (id: string) =>
  useQuery(providerProfileRevisionDetailQueryOptions(id));

export const useAdminDecideProviderProfileRevision = () =>
  useMutation({
    ...orpc.protection.adminProviderProfileRevisions.decide.mutationOptions(),
    onSuccess: invalidateProviderProfileRevisions,
  });
