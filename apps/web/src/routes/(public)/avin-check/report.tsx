import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { requireSession } from "@/features/auth/guards/require-session";
import { RiskReportPage } from "@/features/protection/pages/risk-report-page";

// oxlint-disable-next-line sort-keys
export const Route = createFileRoute("/(public)/avin-check/report")({
  validateSearch: z.object({ reportId: z.uuid().optional() }),
  beforeLoad: ({ context, location }) =>
    requireSession(
      context.queryClient,
      `${location.pathname}${location.searchStr}`
    ),
  component: RiskReportPage,
  head: () => ({
    meta: [
      { title: "Gửi cảnh báo rủi ro | Avin Check" },
      {
        content:
          "Gửi báo cáo bank, ví hoặc số điện thoại cho Risk Moderator bằng account Avin đã đăng nhập.",
        name: "description",
      },
    ],
  }),
});
