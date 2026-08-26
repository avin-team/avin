import type { SupportReviewStatus } from "@avin/api/protection/support-review";
import type { AppRouterClient } from "@avin/api/router";
import { useMutation, useQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";

export type SupportReview = Awaited<
  ReturnType<AppRouterClient["protection"]["adminSupportReviews"]["get"]>
>;

const invalidateSupportReviews = async (): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: orpc.protection.adminSupportReviews.list.key(),
    }),
    queryClient.invalidateQueries({
      queryKey: orpc.protection.adminSupportReviews.get.key(),
    }),
    queryClient.invalidateQueries({
      queryKey: orpc.protection.adminProviderRiskIncidents.list.key(),
    }),
    queryClient.invalidateQueries({
      queryKey: orpc.protection.adminProviderRiskIncidents.get.key(),
    }),
    queryClient.invalidateQueries({
      queryKey: orpc.protection.publicRiskWarnings.list.key(),
    }),
    queryClient.invalidateQueries({
      queryKey: orpc.protection.publicRiskWarnings.get.key(),
    }),
  ]);
};

export const useAdminSupportReviews = (params?: {
  incidentId?: string;
  profileId?: string;
  status?: SupportReviewStatus;
}) =>
  useQuery(
    orpc.protection.adminSupportReviews.list.queryOptions({ input: params })
  );

export const useStartAdminSupportReview = () =>
  useMutation({
    ...orpc.protection.adminSupportReviews.start.mutationOptions(),
    onSuccess: invalidateSupportReviews,
  });

export const useEvaluateAdminSupportReview = () =>
  useMutation({
    ...orpc.protection.adminSupportReviews.evaluate.mutationOptions(),
    onSuccess: invalidateSupportReviews,
  });

export const useRecordAdminSupportReviewOutcome = () =>
  useMutation({
    ...orpc.protection.adminSupportReviews.recordOutcome.mutationOptions(),
    onSuccess: invalidateSupportReviews,
  });

export const useApproveAdminSupportReview = () =>
  useMutation({
    ...orpc.protection.adminSupportReviews.approve.mutationOptions(),
    onSuccess: invalidateSupportReviews,
  });

export const useReconsiderAdminSupportReview = () =>
  useMutation({
    ...orpc.protection.adminSupportReviews.reconsider.mutationOptions(),
    onSuccess: invalidateSupportReviews,
  });
