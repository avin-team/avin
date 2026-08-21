import { createFileRoute } from "@tanstack/react-router";

import { RiskReportQueuePage } from "@/features/protection/pages/risk-report-queue-page";

export const Route = createFileRoute(
  "/_authenticated/avin-check/risk-reports/"
)({
  component: RiskReportQueuePage,
});
