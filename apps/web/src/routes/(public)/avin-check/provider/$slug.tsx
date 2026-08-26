import { createFileRoute } from "@tanstack/react-router";

import { ProviderPublicProfilePage } from "@/features/protection/pages/provider-public-profile-page";

export const Route = createFileRoute("/(public)/avin-check/provider/$slug")({
  component: ProviderPublicProfilePage,
  head: ({ params }) => ({
    meta: [
      { title: `Provider ${params.slug} | Avin Check` },
      {
        content:
          "Profile Provider đã được Avin Check xem xét và phát hành theo quy trình Admin.",
        name: "description",
      },
    ],
  }),
});
