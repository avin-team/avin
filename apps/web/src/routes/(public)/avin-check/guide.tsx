import { createFileRoute } from "@tanstack/react-router";

import { AvinCheckLandingPage } from "@/features/protection/pages/avin-check-landing-page";

export const Route = createFileRoute("/(public)/avin-check/guide")({
  component: AvinCheckLandingPage,
  head: () => ({
    meta: [
      { title: "Hướng dẫn an toàn | Avin Check" },
      {
        content:
          "Tìm hiểu phạm vi xác minh, chính sách và hướng dẫn giao dịch an toàn của Avin Check.",
        name: "description",
      },
    ],
  }),
});
