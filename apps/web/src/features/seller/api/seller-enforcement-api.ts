import { useMutation, useQuery } from "@tanstack/react-query";

import { orpc, queryClient } from "@/utils/orpc";

export const sellerEnforcementQueryKey = () =>
  orpc.sellerEnforcement.seller.get.key();

export const sellerEnforcementQueryOptions = () =>
  orpc.sellerEnforcement.seller.get.queryOptions();

export const sellerAppealsQueryKey = (limit?: number) =>
  orpc.sellerEnforcement.seller.appeals.key({ input: { limit } });

export const sellerAppealsQueryOptions = (limit?: number) =>
  orpc.sellerEnforcement.seller.appeals.queryOptions({
    input: { limit },
  });

export const sellerAppealDetailQueryOptions = (appealId: string) =>
  orpc.sellerEnforcement.seller.getAppeal.queryOptions({
    input: { appealId },
  });

export const invalidateSellerEnforcement = async () => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: orpc.sellerEnforcement.seller.get.key(),
    }),
    queryClient.invalidateQueries({
      queryKey: orpc.sellerEnforcement.seller.appeals.key(),
    }),
    queryClient.invalidateQueries({
      queryKey: orpc.sellerStore.getProfile.key(),
    }),
  ]);
};

export const useSellerEnforcement = () =>
  useQuery(sellerEnforcementQueryOptions());

export const useSellerAppeals = (limit?: number) =>
  useQuery(sellerAppealsQueryOptions(limit));

export const useSellerAppealDetail = (appealId: string) =>
  useQuery(sellerAppealDetailQueryOptions(appealId));

export const useSubmitSellerAppeal = () =>
  useMutation({
    ...orpc.sellerEnforcement.seller.submitAppeal.mutationOptions(),
    onSuccess: async () => {
      await invalidateSellerEnforcement();
    },
  });

export const useSellerAppealEvidenceUrl = () =>
  useMutation(
    orpc.sellerEnforcement.seller.getAppealEvidenceUrl.mutationOptions()
  );
