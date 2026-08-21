import { createFileRoute } from "@tanstack/react-router";

import { AvinCheckLandingPage } from "@/features/protection/pages/avin-check-landing-page";

export const Route = createFileRoute("/(public)/avin-check")({
  component: AvinCheckLandingPage,
  head: () => ({
    meta: [
      { title: "Avin Check | Avin" },
      {
        content:
          "Kiểm tra Đối tác Avin và cảnh báo giao dịch bên ngoài với phạm vi rõ ràng.",
        name: "description",
      },
    ],
  }),
});
