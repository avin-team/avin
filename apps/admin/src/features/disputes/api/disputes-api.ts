import { useMutation, useQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";

import type { AdminApiDisputeStatus } from "../types";

export const adminDisputesQueryOptions = (
  status: AdminApiDisputeStatus | "ALL" = "ALL"
) =>
  orpc.commerce.disputes.adminList.queryOptions({
    input: { status },
  });

export const adminDisputeQueryOptions = (disputeId: string) =>
  orpc.commerce.disputes.adminGet.queryOptions({
    input: { disputeId },
  });

const invalidateDisputes = (disputeId?: string): void => {
  void queryClient.invalidateQueries({
    queryKey: orpc.commerce.disputes.adminList.key(),
  });
  if (disputeId) {
    void queryClient.invalidateQueries({
      queryKey: orpc.commerce.disputes.adminGet.key(),
    });
  }
};

export const useAdminDisputes = (
  status: AdminApiDisputeStatus | "ALL" = "ALL"
) => useQuery(adminDisputesQueryOptions(status));

export const useAdminDispute = (disputeId: string) =>
  useQuery(adminDisputeQueryOptions(disputeId));

export const useDisputeEvidenceUrl = () =>
  useMutation(orpc.commerce.disputes.adminEvidenceUrl.mutationOptions());

export const useResolveDispute = () =>
  useMutation({
    ...orpc.commerce.disputes.adminResolve.mutationOptions(),
    onSuccess: (result) => {
      invalidateDisputes(result.disputeId);
    },
  });
