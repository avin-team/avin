import type { AppRouterClient } from "@avin/api/router";
import { useQuery } from "@tanstack/react-query";

import { orpc } from "@/utils/orpc";

export type PublicRiskWarning = Awaited<
  ReturnType<AppRouterClient["protection"]["publicRiskWarnings"]["get"]>
>;
export type PublicRiskWarningList = Awaited<
  ReturnType<AppRouterClient["protection"]["publicRiskWarnings"]["list"]>
>;

const CHONGSCAM_UI_PREVIEW_SOURCE_IDS = [
  "e482596a-83f5-46a8-9e0b-f2eb14e0bf32",
  "277bc6af-7f39-4fa8-8dea-09fb975e01ea",
  "6cdb4c23-6f73-4655-9daf-b817e36a09ff",
];

export const usePublicRiskWarnings = () =>
  useQuery(
    orpc.protection.publicRiskWarnings.list.queryOptions({
      input: {
        limit: CHONGSCAM_UI_PREVIEW_SOURCE_IDS.length,
        source: "chongscam",
        sourceReportIds: CHONGSCAM_UI_PREVIEW_SOURCE_IDS,
      },
    })
  );

export const usePublicRiskWarning = (slug: string) =>
  useQuery(
    orpc.protection.publicRiskWarnings.get.queryOptions({
      input: { slug },
    })
  );
