import { createFileRoute } from "@tanstack/react-router";

import { ProviderDirectoryPage } from "@/features/protection/pages/provider-directory-page";

export const Route = createFileRoute("/(public)/avin-check/directory")({
  component: ProviderDirectoryPage,
  head: () => ({
    meta: [
      { title: "Đối tác | Avin Check" },
      {
        content:
          "Tìm kiếm theo tên và xem hồ sơ công khai của các đối tác Avin đã được xác minh.",
        name: "description",
      },
    ],
  }),
});
