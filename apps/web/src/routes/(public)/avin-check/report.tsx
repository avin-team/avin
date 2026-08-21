import { createFileRoute } from "@tanstack/react-router";

import { RiskReportPage } from "@/features/protection/pages/risk-report-page";

export const Route = createFileRoute("/(public)/avin-check/report")({
  component: RiskReportPage,
  head: () => ({
    meta: [
      { title: "Gửi cảnh báo rủi ro | Avin Check" },
      {
        content:
          "Gửi báo cáo bank, ví hoặc số điện thoại cho Risk Moderator mà không cần tạo tài khoản Avin.",
        name: "description",
      },
    ],
  }),
});
