import { createFileRoute, redirect } from "@tanstack/react-router";

import { redirectMobileGuest } from "@/features/auth/guards/redirect-mobile-guest";

export const Route = createFileRoute("/(public)/")({
  beforeLoad: async () => {
    await redirectMobileGuest();
    throw redirect({ to: "/category" });
  },
});
