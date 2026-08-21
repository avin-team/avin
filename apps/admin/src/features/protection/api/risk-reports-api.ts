import type { RiskReportStatus } from "@avin/api/protection/risk-report";
import type { AppRouterClient } from "@avin/api/router";
import { useMutation, useQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";

export type RiskReportDetail = Awaited<
  ReturnType<AppRouterClient["protection"]["adminRiskReports"]["get"]>
>;

export type RiskReportDecision =
  | "CHANGES_REQUESTED"
  | "CORRECTED"
  | "PUBLISHED"
  | "REJECTED"
  | "REMOVED"
  | "UNDER_REVIEW";

export const useAdminRiskReports = (params?: {
  search?: string;
  status?: RiskReportStatus;
}) =>
  useQuery(
    orpc.protection.adminRiskReports.list.queryOptions({ input: params })
  );

export const useAdminRiskReport = (id: string) =>
  useQuery(
    orpc.protection.adminRiskReports.get.queryOptions({ input: { id } })
  );

const invalidateRiskReports = async (): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: orpc.protection.adminRiskReports.list.key(),
    }),
    queryClient.invalidateQueries({
      queryKey: orpc.protection.adminRiskReports.get.key(),
    }),
  ]);
};

export const useDecideAdminRiskReport = () =>
  useMutation({
    ...orpc.protection.adminRiskReports.decide.mutationOptions(),
    onSuccess: invalidateRiskReports,
  });

export const useRegisterRiskReportDerivative = () =>
  useMutation({
    ...orpc.protection.adminRiskReports.registerDerivative.mutationOptions(),
    onSuccess: invalidateRiskReports,
  });
