import { createFileRoute } from "@tanstack/react-router";

import { ProviderPolicyPage } from "@/features/protection/pages/provider-policy-page";

export const Route = createFileRoute("/(public)/avin-check/partner-policy")({
  component: ProviderPolicyPage,
  head: () => ({
    meta: [
      { title: "Quy chế Đối tác | Avin Check" },
      {
        content:
          "Quy chế hoạt động, mức ký quỹ và phí thành viên hiện hành dành cho Đối tác Avin Check.",
        name: "description",
      },
    ],
  }),
});
