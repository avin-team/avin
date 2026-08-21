import { createFileRoute } from "@tanstack/react-router";

import { ProviderDirectoryPage } from "@/features/protection/pages/provider-directory-page";

export const Route = createFileRoute("/(public)/avin-check/directory")({
  component: ProviderDirectoryPage,
  head: () => ({
    meta: [
      { title: "Provider Directory | Avin Check" },
      {
        content:
          "Duyệt và tra cứu chính xác các profile Provider đang hoạt động trong Avin Check.",
        name: "description",
      },
    ],
  }),
});
