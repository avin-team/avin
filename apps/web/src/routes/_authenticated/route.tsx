import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { MainLayout } from "@/components/layout/main-layout";
import { requireSession } from "@/features/auth/guards/require-session";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const session = await requireSession();
    const user = session.data?.user;
    const isSeller = user?.role === ACCOUNT_ROLE.SELLER;
    const hasSeenOnboarding =
      user &&
      "hasSeenSellerOnboarding" in user &&
      typeof user.hasSeenSellerOnboarding === "boolean"
        ? user.hasSeenSellerOnboarding
        : false;

    if (
      isSeller &&
      !hasSeenOnboarding &&
      location.pathname !== "/seller/onboarding"
    ) {
      throw redirect({ to: "/seller/onboarding" });
    }

    return { session };
  },
  component: MainLayout,
});
