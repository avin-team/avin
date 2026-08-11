import { useMutation, useQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";

export const sellerEnforcementQueryOptions = (sellerId: string) =>
  orpc.sellerEnforcement.admin.get.queryOptions({
    input: { sellerId },
  });

export const sellerEnforcementHistoryQueryOptions = (
  sellerId: string,
  limit?: number
) =>
  orpc.sellerEnforcement.admin.history.queryOptions({
    input: { limit, sellerId },
  });

export const sellerEnforcementAppealsQueryOptions = (
  sellerId: string,
  limit?: number
) =>
  orpc.sellerEnforcement.admin.appeals.queryOptions({
    input: { limit, sellerId },
  });

export const sellerEnforcementAppealDetailQueryOptions = (appealId: string) =>
  orpc.sellerEnforcement.admin.getAppeal.queryOptions({
    input: { appealId },
  });

export const sellerRemediationItemsQueryOptions = (remediationId: string) =>
  orpc.sellerEnforcement.admin.remediationItems.queryOptions({
    input: { remediationId },
  });

export const invalidateSellerEnforcementAdmin = (sellerId?: string) => {
  if (sellerId) {
    queryClient.invalidateQueries({
      queryKey: orpc.sellerEnforcement.admin.get.key({ input: { sellerId } }),
    });
    queryClient.invalidateQueries({
      queryKey: orpc.sellerEnforcement.admin.history.key({
        input: { sellerId },
      }),
    });
    queryClient.invalidateQueries({
      queryKey: orpc.sellerEnforcement.admin.appeals.key({
        input: { sellerId },
      }),
    });
  } else {
    queryClient.invalidateQueries({
      queryKey: ["sellerEnforcement"],
    });
  }
};

export const useAdminSellerEnforcement = (sellerId: string) =>
  useQuery(sellerEnforcementQueryOptions(sellerId));

export const useAdminSellerEnforcementHistory = (
  sellerId: string,
  limit?: number
) => useQuery(sellerEnforcementHistoryQueryOptions(sellerId, limit));

export const useAdminSellerEnforcementAppeals = (
  sellerId: string,
  limit?: number
) => useQuery(sellerEnforcementAppealsQueryOptions(sellerId, limit));

export const useAdminSellerEnforcementAppealDetail = (appealId: string) =>
  useQuery(sellerEnforcementAppealDetailQueryOptions(appealId));

export const useAdminRemediationItems = (remediationId: string | undefined) =>
  useQuery({
    ...sellerRemediationItemsQueryOptions(remediationId ?? ""),
    enabled: Boolean(remediationId),
  });

export const useApplySellerEnforcement = () =>
  useMutation({
    ...orpc.sellerEnforcement.admin.apply.mutationOptions(),
    onSuccess: (_, variables) => {
      invalidateSellerEnforcementAdmin(variables.sellerId);
    },
  });

export const useLiftSellerEnforcement = () =>
  useMutation({
    ...orpc.sellerEnforcement.admin.lift.mutationOptions(),
    onSuccess: (_, variables) => {
      invalidateSellerEnforcementAdmin(variables.sellerId);
    },
  });

export const useCorrectEnforcementReason = () =>
  useMutation({
    ...orpc.sellerEnforcement.admin.correctReason.mutationOptions(),
    onSuccess: (_, variables) => {
      invalidateSellerEnforcementAdmin(variables.sellerId);
    },
  });

export const useCorrectEnforcementDecision = () =>
  useMutation({
    ...orpc.sellerEnforcement.admin.correctDecision.mutationOptions(),
    onSuccess: (_, variables) => {
      invalidateSellerEnforcementAdmin(variables.sellerId);
    },
  });

export const useReviewSellerAppeal = (sellerId?: string) =>
  useMutation({
    ...orpc.sellerEnforcement.admin.reviewAppeal.mutationOptions(),
    onSuccess: () => {
      invalidateSellerEnforcementAdmin(sellerId);
    },
  });

export const useRetryRemediation = (sellerId?: string) =>
  useMutation({
    ...orpc.sellerEnforcement.admin.retryRemediation.mutationOptions(),
    onSuccess: () => {
      invalidateSellerEnforcementAdmin(sellerId);
    },
  });

export const useAppealEvidenceUrl = () =>
  useMutation(
    orpc.sellerEnforcement.admin.getAppealEvidenceUrl.mutationOptions()
  );
