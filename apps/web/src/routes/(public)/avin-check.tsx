import { createFileRoute } from "@tanstack/react-router";

import { AvinCheckLayout } from "@/features/protection/components/avin-check-layout";

export const Route = createFileRoute("/(public)/avin-check")({
  component: AvinCheckLayout,
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
