import { createFileRoute } from "@tanstack/react-router";

import { RiskLookupPage } from "@/features/protection/pages/risk-lookup-page";

export const Route = createFileRoute("/(public)/avin-check/check")({
  component: RiskLookupPage,
  head: () => ({
    meta: [
      { title: "Tra cứu Risk Identifier | Avin Check" },
      {
        content:
          "Tra cứu exact-match các Risk Identifier và xem thống kê công khai của Avin Check.",
        name: "description",
      },
    ],
  }),
});
