import type { AppRouterClient } from "@avin/api/router";
import { useMutation, useQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";

export type ExternalImportRun = Awaited<
  ReturnType<AppRouterClient["protection"]["adminExternalRisk"]["listRuns"]>
>[number];
export type ExternalRiskReportListResult = Awaited<
  ReturnType<AppRouterClient["protection"]["adminExternalRisk"]["listReports"]>
>;
export type ExternalRiskReport = ExternalRiskReportListResult["items"][number];

export const useExternalImportRuns = () =>
  useQuery(
    orpc.protection.adminExternalRisk.listRuns.queryOptions({
      input: undefined,
    })
  );

export const useExternalRiskReports = (params?: {
  includeHidden?: boolean;
  page?: number;
  pageSize?: number;
  search?: string;
}) =>
  useQuery(
    orpc.protection.adminExternalRisk.listReports.queryOptions({
      input: params,
    })
  );

const invalidateExternalRisk = async (): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: orpc.protection.adminExternalRisk.listRuns.key(),
    }),
    queryClient.invalidateQueries({
      queryKey: orpc.protection.adminExternalRisk.listReports.key(),
    }),
    queryClient.invalidateQueries({
      queryKey: orpc.protection.publicRiskWarnings.list.key(),
    }),
    queryClient.invalidateQueries({
      queryKey: orpc.protection.publicRiskWarnings.get.key(),
    }),
    queryClient.invalidateQueries({
      queryKey: orpc.protection.adminRiskReports.get.key(),
    }),
  ]);
};

export const usePreviewExternalRiskImport = () =>
  useMutation({
    ...orpc.protection.adminExternalRisk.preview.mutationOptions(),
    onSuccess: invalidateExternalRisk,
  });

export const useApplyExternalRiskImport = () =>
  useMutation({
    ...orpc.protection.adminExternalRisk.apply.mutationOptions(),
    onSuccess: invalidateExternalRisk,
  });

export const useHideExternalRiskReport = () =>
  useMutation({
    ...orpc.protection.adminExternalRisk.hide.mutationOptions(),
    onSuccess: invalidateExternalRisk,
  });

export const useRestoreExternalRiskReport = () =>
  useMutation({
    ...orpc.protection.adminExternalRisk.restore.mutationOptions(),
    onSuccess: invalidateExternalRisk,
  });
