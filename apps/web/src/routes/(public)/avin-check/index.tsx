import { createFileRoute } from "@tanstack/react-router";

import { RiskLookupPage } from "@/features/protection/pages/risk-lookup-page";

export const Route = createFileRoute("/(public)/avin-check/")({
  component: RiskLookupPage,
  head: () => ({
    meta: [
      { title: "Tra cứu scam | Avin Check" },
      {
        content:
          "Tra cứu chính xác thông tin đối tác, tài khoản và các cảnh báo rủi ro công khai trên Avin Check.",
        name: "description",
      },
    ],
  }),
});
