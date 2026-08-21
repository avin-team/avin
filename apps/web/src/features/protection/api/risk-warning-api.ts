import type { AppRouterClient } from "@avin/api/router";
import { useQuery } from "@tanstack/react-query";

import { orpc } from "@/utils/orpc";

export type PublicRiskWarning = Awaited<
  ReturnType<AppRouterClient["protection"]["publicRiskWarnings"]["get"]>
>;
export type PublicRiskWarningList = Awaited<
  ReturnType<AppRouterClient["protection"]["publicRiskWarnings"]["list"]>
>;

export const usePublicRiskWarnings = () =>
  useQuery(
    orpc.protection.publicRiskWarnings.list.queryOptions({
      input: { limit: 24 },
    })
  );

export const usePublicRiskWarning = (slug: string) =>
  useQuery(
    orpc.protection.publicRiskWarnings.get.queryOptions({
      input: { slug },
    })
  );
