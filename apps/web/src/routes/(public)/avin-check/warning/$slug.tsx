import { createFileRoute } from "@tanstack/react-router";

import { PublicRiskWarningDetailPage } from "@/features/protection/pages/public-risk-warning-detail-page";

export const Route = createFileRoute("/(public)/avin-check/warning/$slug")({
  component: PublicRiskWarningDetailPage,
  head: ({ params }) => ({
    meta: [
      { title: `Risk Warning ${params.slug} | Avin Check` },
      {
        content:
          "Chi tiết cảnh báo rủi ro công khai với định danh đã được che và bằng chứng derivative đã xử lý.",
        name: "description",
      },
    ],
  }),
});
