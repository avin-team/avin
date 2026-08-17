import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";

export const advisorProviderStatusQueryOptions = () =>
  orpc.advisor.provider.get.queryOptions({ input: undefined });

export const useAdvisorProviderStatus = () =>
  useQuery(advisorProviderStatusQueryOptions());

const useInvalidateAdvisorProviderStatus = () => {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: advisorProviderStatusQueryOptions().queryKey,
    });
};

export const useTestAdvisorProvider = () => {
  const invalidate = useInvalidateAdvisorProviderStatus();
  return useMutation({
    ...orpc.advisor.provider.test.mutationOptions(),
    onSuccess: () => {
      void invalidate();
    },
  });
};

export const useActivateAdvisorProvider = () => {
  const invalidate = useInvalidateAdvisorProviderStatus();
  return useMutation({
    ...orpc.advisor.provider.activate.mutationOptions(),
    onSuccess: () => {
      void invalidate();
    },
  });
};

export const useDisableAdvisorProvider = () => {
  const invalidate = useInvalidateAdvisorProviderStatus();
  return useMutation({
    ...orpc.advisor.provider.disable.mutationOptions(),
    onSuccess: () => {
      void invalidate();
    },
  });
};

export type { AdvisorProviderConfigInput } from "@avin/api/advisor/provider";
