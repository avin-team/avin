import { createFileRoute } from "@tanstack/react-router";

import { requireSession } from "@/features/auth/guards/require-session";
import { RiskReportPage } from "@/features/protection/pages/risk-report-page";

export const Route = createFileRoute("/(public)/avin-check/report")({
  beforeLoad: ({ context, location }) =>
    requireSession(
      context.queryClient,
      `${location.pathname}${location.search}`
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
