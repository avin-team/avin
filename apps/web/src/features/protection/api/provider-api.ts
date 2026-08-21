import type { AppRouterClient } from "@avin/api/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { orpc } from "@/utils/orpc";

export type ProviderWorkspace = Awaited<
  ReturnType<AppRouterClient["protection"]["providerWorkspace"]>
>;
export type ProviderApplication = NonNullable<ProviderWorkspace["application"]>;
export type ProviderProfileRevision = NonNullable<
  ProviderWorkspace["profileRevision"]
>;
export type ProviderRiskIncident = ProviderWorkspace["riskIncidents"][number];
export type ProviderBondWithdrawal = NonNullable<
  ProviderWorkspace["bondWithdrawal"]
>;
export type ProviderProtectionPolicy = NonNullable<ProviderWorkspace["policy"]>;

export const useProviderWorkspace = () =>
  useQuery(orpc.protection.providerWorkspace.queryOptions());

export const useProviderProtectionPolicy = () =>
  useQuery(orpc.protection.providerPolicy.get.queryOptions());

export const useProviderNotifications = () =>
  useQuery(
    orpc.protection.providerNotifications.list.queryOptions({
      input: { limit: 10 },
    })
  );

export const useProviderApplicationActions = () => {
  const queryClient = useQueryClient();
  const invalidateWorkspace = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: orpc.protection.providerWorkspace.queryOptions().queryKey,
    });
  };

  const saveDraft = useMutation({
    ...orpc.protection.providerApplication.saveDraft.mutationOptions(),
    onSuccess: invalidateWorkspace,
  });
  const submit = useMutation({
    ...orpc.protection.providerApplication.submit.mutationOptions(),
    onSuccess: invalidateWorkspace,
  });

  return { saveDraft, submit };
};

export const useProviderProfileRevisionActions = () => {
  const queryClient = useQueryClient();
  const invalidateWorkspace = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: orpc.protection.providerWorkspace.queryOptions().queryKey,
    });
  };

  const start = useMutation({
    ...orpc.protection.providerProfileRevision.start.mutationOptions(),
    onSuccess: invalidateWorkspace,
  });
  const saveDraft = useMutation({
    ...orpc.protection.providerProfileRevision.saveDraft.mutationOptions(),
    onSuccess: invalidateWorkspace,
  });
  const submit = useMutation({
    ...orpc.protection.providerProfileRevision.submit.mutationOptions(),
    onSuccess: invalidateWorkspace,
  });

  return { saveDraft, start, submit };
};

export const useProviderRiskIncidentActions = () => {
  const queryClient = useQueryClient();
  const invalidateWorkspace = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: orpc.protection.providerWorkspace.queryOptions().queryKey,
    });
  };

  const registerEvidence = useMutation({
    ...orpc.protection.providerRiskIncidents.registerEvidence.mutationOptions(),
    onSuccess: invalidateWorkspace,
  });
  const respond = useMutation({
    ...orpc.protection.providerRiskIncidents.respond.mutationOptions(),
    onSuccess: invalidateWorkspace,
  });

  return { registerEvidence, respond };
};

export const useProviderBondWithdrawalActions = () => {
  const queryClient = useQueryClient();
  const invalidateWorkspace = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: orpc.protection.providerWorkspace.queryOptions().queryKey,
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.protection.providerBondWithdrawals.get.key(),
      }),
    ]);
  };

  const request = useMutation({
    ...orpc.protection.providerBondWithdrawals.request.mutationOptions(),
    onSuccess: invalidateWorkspace,
  });

  return { request };
};

export const useProviderProtectionPolicyActions = () => {
  const queryClient = useQueryClient();
  const invalidatePolicy = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: orpc.protection.providerWorkspace.queryOptions().queryKey,
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.protection.providerPolicy.get.key(),
      }),
    ]);
  };

  const accept = useMutation({
    ...orpc.protection.providerPolicy.accept.mutationOptions(),
    onSuccess: invalidatePolicy,
  });

  return { accept };
};
