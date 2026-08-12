import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { MainLayout } from "@/components/layout/main-layout";
import { authClient } from "@/features/auth/api/auth-client";
import { requireSession } from "@/features/auth/guards/require-session";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location, search }) => {
    const session = await requireSession();
    const user = session.data?.user;

    // Bug 1 fix: If redirected here via Google sign-in (not sign-up) and
    // this is a brand-new account (created in the last 30s), the user didn't
    // have an account. Sign them out and send them back to login with an error.
    const isSignInOnly = "signInOnly" in search && search.signInOnly === "1";
    if (isSignInOnly && user) {
      let createdAt: Date | null = null;
      if ("createdAt" in user && user.createdAt instanceof Date) {
        ({ createdAt } = user);
      } else if (user.createdAt) {
        createdAt = new Date(user.createdAt as unknown as string);
      }
      const isNewAccount =
        createdAt && Date.now() - createdAt.getTime() < 30_000;
      if (isNewAccount) {
        await authClient.signOut();
        throw redirect({
          search: { googleError: "not_registered" } as never,
          to: "/login",
        });
      }
    }

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
