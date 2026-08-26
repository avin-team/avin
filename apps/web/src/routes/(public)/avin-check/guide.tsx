import { createFileRoute } from "@tanstack/react-router";

import { AvinCheckGuidePage } from "@/features/protection/pages/avin-check-guide-page";

export const Route = createFileRoute("/(public)/avin-check/guide")({
  component: AvinCheckGuidePage,
  head: () => ({
    meta: [
      { title: "Cẩm nang Quy chế & Hướng dẫn An toàn | Avin Check" },
      {
        content:
          "Tra cứu điều khoản sử dụng, nội quy giao dịch, cẩm nang phòng chống lừa đảo và 27 điều khoản nghiệp vụ Đối tác Avin Check.",
        name: "description",
      },
    ],
  }),
});
