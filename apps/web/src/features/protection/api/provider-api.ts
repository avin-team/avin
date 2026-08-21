import type { AppRouterClient } from "@avin/api/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { providerOrpc } from "./provider-orpc";

export type ProviderWorkspace = Awaited<
  ReturnType<AppRouterClient["protection"]["providerWorkspace"]>
>;
export type ProviderApplication = NonNullable<ProviderWorkspace["application"]>;
export type ProviderProfileRevision = NonNullable<
  ProviderWorkspace["profileRevision"]
>;

export const useProviderWorkspace = () =>
  useQuery(providerOrpc.protection.providerWorkspace.queryOptions());

export const useProviderNotifications = () =>
  useQuery(
    providerOrpc.protection.providerNotifications.list.queryOptions({
      input: { limit: 10 },
    })
  );

export const useProviderApplicationActions = () => {
  const queryClient = useQueryClient();
  const invalidateWorkspace = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey:
        providerOrpc.protection.providerWorkspace.queryOptions().queryKey,
    });
  };

  const saveDraft = useMutation({
    ...providerOrpc.protection.providerApplication.saveDraft.mutationOptions(),
    onSuccess: invalidateWorkspace,
  });
  const submit = useMutation({
    ...providerOrpc.protection.providerApplication.submit.mutationOptions(),
    onSuccess: invalidateWorkspace,
  });

  return { saveDraft, submit };
};

export const useProviderProfileRevisionActions = () => {
  const queryClient = useQueryClient();
  const invalidateWorkspace = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey:
        providerOrpc.protection.providerWorkspace.queryOptions().queryKey,
    });
  };

  const start = useMutation({
    ...providerOrpc.protection.providerProfileRevision.start.mutationOptions(),
    onSuccess: invalidateWorkspace,
  });
  const saveDraft = useMutation({
    ...providerOrpc.protection.providerProfileRevision.saveDraft.mutationOptions(),
    onSuccess: invalidateWorkspace,
  });
  const submit = useMutation({
    ...providerOrpc.protection.providerProfileRevision.submit.mutationOptions(),
    onSuccess: invalidateWorkspace,
  });

  return { saveDraft, start, submit };
};
