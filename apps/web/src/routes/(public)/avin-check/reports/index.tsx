import { createFileRoute } from "@tanstack/react-router";

import { requireSession } from "@/features/auth/guards/require-session";
import { RiskReportWorkspacePage } from "@/features/protection/pages/risk-report-workspace-page";

export const Route = createFileRoute("/(public)/avin-check/reports/")({
  beforeLoad: ({ context, location }) =>
    requireSession(
      context.queryClient,
      `${location.pathname}${location.search}`
    ),
  component: RiskReportWorkspacePage,
});
