import type { AppRouterClient } from "@avin/api/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";

export type ProtectionPilotConfiguration = Awaited<
  ReturnType<AppRouterClient["protection"]["adminPilot"]["get"]>
>;
export type ProtectionPilotInvitation = Awaited<
  ReturnType<AppRouterClient["protection"]["adminPilot"]["invitations"]>
>[number];

const invalidatePilot = async (
  queryClient: ReturnType<typeof useQueryClient>
): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: orpc.protection.adminPilot.get.key(),
    }),
    queryClient.invalidateQueries({
      queryKey: orpc.protection.adminPilot.invitations.key(),
    }),
  ]);
};

export const useProtectionPilotConfiguration = () =>
  useQuery(orpc.protection.adminPilot.get.queryOptions());

export const useProtectionPilotInvitations = () =>
  useQuery(orpc.protection.adminPilot.invitations.queryOptions());

export const useUpdateProtectionPilotConfiguration = () => {
  const queryClient = useQueryClient();
  return useMutation({
    ...orpc.protection.adminPilot.update.mutationOptions(),
    onSuccess: () => invalidatePilot(queryClient),
  });
};

export const useInviteProtectionPilotProvider = () => {
  const queryClient = useQueryClient();
  return useMutation({
    ...orpc.protection.adminPilot.invite.mutationOptions(),
    onSuccess: () => invalidatePilot(queryClient),
  });
};
