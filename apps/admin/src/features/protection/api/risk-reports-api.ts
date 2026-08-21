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
  | "UNDER_REVIEW"
  | "UNDER_VERIFICATION";

export type ProviderRiskIncident = Awaited<
  ReturnType<AppRouterClient["protection"]["adminProviderRiskIncidents"]["get"]>
>;
export type ProviderRiskIncidentCandidate = Awaited<
  ReturnType<
    AppRouterClient["protection"]["adminProviderRiskIncidents"]["candidates"]
  >
>[number];

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

const invalidateProviderRiskIncidents = async (): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: orpc.protection.adminProviderRiskIncidents.list.key(),
    }),
    queryClient.invalidateQueries({
      queryKey: orpc.protection.adminProviderRiskIncidents.get.key(),
    }),
    queryClient.invalidateQueries({
      queryKey: orpc.protection.adminRiskReports.get.key(),
    }),
  ]);
};

export const useAdminProviderRiskIncidents = (reportId?: string) =>
  useQuery(
    orpc.protection.adminProviderRiskIncidents.list.queryOptions({
      input: reportId ? { reportId } : undefined,
    })
  );

export const useAdminProviderRiskIncidentCandidates = (search?: string) =>
  useQuery(
    orpc.protection.adminProviderRiskIncidents.candidates.queryOptions({
      input: search ? { search } : undefined,
    })
  );

export const useConfirmAdminProviderRiskIncidentFraud = () =>
  useMutation({
    ...orpc.protection.adminProviderRiskIncidents.confirmFraud.mutationOptions(),
    onSuccess: invalidateProviderRiskIncidents,
  });

export const useLinkAdminProviderRiskIncident = () =>
  useMutation({
    ...orpc.protection.adminProviderRiskIncidents.link.mutationOptions(),
    onSuccess: invalidateProviderRiskIncidents,
  });

export const useReviewAdminProviderRiskIncident = () =>
  useMutation({
    ...orpc.protection.adminProviderRiskIncidents.review.mutationOptions(),
    onSuccess: invalidateProviderRiskIncidents,
  });
