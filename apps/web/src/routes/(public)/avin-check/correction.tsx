import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { requireSession } from "@/features/auth/guards/require-session";
import { RiskReportCorrectionPage } from "@/features/protection/pages/risk-report-correction-page";

// oxlint-disable-next-line sort-keys
export const Route = createFileRoute("/(public)/avin-check/correction")({
  validateSearch: z.object({ reportId: z.uuid().optional() }),
  beforeLoad: ({ context, location }) =>
    requireSession(
      context.queryClient,
      `${location.pathname}${location.searchStr}`
    ),
  component: RiskReportCorrectionPage,
});
