import { createFileRoute } from "@tanstack/react-router";

import { RiskReportDetailPage } from "@/features/protection/pages/risk-report-detail-page";

export const Route = createFileRoute(
  "/_authenticated/avin-check/risk-reports/$reportId"
)({
  component: RiskReportDetailPage,
});
