import type { AppRouterClient } from "@avin/api/router";
import { useMutation, useQuery } from "@tanstack/react-query";

import { orpc } from "@/utils/orpc";

export type PublicRiskIdentifierLookup = Awaited<
  ReturnType<AppRouterClient["protection"]["publicRiskLookup"]["search"]>
>;
export type PublicRiskStatistics = Awaited<
  ReturnType<AppRouterClient["protection"]["publicRiskLookup"]["statistics"]>
>;

const PUBLIC_RISK_STATISTICS_STALE_TIME_MS = 5 * 60 * 1000;

export const usePublicRiskIdentifierSearch = () =>
  useMutation(orpc.protection.publicRiskLookup.search.mutationOptions());

export const usePublicRiskStatistics = () =>
  useQuery({
    ...orpc.protection.publicRiskLookup.statistics.queryOptions(),
    gcTime: PUBLIC_RISK_STATISTICS_STALE_TIME_MS * 2,
    staleTime: PUBLIC_RISK_STATISTICS_STALE_TIME_MS,
  });
