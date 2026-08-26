import type { AppRouterClient } from "@avin/api/router";
import { useMutation, useQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";

export type AdminProtectionPolicy = Awaited<
  ReturnType<AppRouterClient["protection"]["adminProviderPolicies"]["list"]>
>[number];

const invalidatePolicies = async (): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: orpc.protection.adminProviderPolicies.list.key(),
    }),
    queryClient.invalidateQueries({
      queryKey: orpc.protection.adminProviderPolicies.get.key(),
    }),
    queryClient.invalidateQueries({
      queryKey: orpc.protection.providerWorkspace.key(),
    }),
  ]);
};

export const useAdminProtectionPolicies = () =>
  useQuery(
    orpc.protection.adminProviderPolicies.list.queryOptions({
      input: undefined,
    })
  );

export const usePublishAdminProtectionPolicy = () =>
  useMutation({
    ...orpc.protection.adminProviderPolicies.publish.mutationOptions(),
    onSuccess: invalidatePolicies,
  });
