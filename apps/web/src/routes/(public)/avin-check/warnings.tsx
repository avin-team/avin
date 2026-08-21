import { createFileRoute } from "@tanstack/react-router";

import { PublicRiskWarningListPage } from "@/features/protection/pages/public-risk-warning-list-page";

export const Route = createFileRoute("/(public)/avin-check/warnings")({
  component: PublicRiskWarningListPage,
  head: () => ({
    meta: [
      { title: "Public Risk Warnings | Avin Check" },
      {
        content:
          "Đọc các cảnh báo rủi ro đã được Risk Moderator Avin Check xem xét và phát hành công khai.",
        name: "description",
      },
    ],
  }),
});
