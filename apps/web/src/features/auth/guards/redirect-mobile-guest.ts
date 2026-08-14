import { redirect } from "@tanstack/react-router";

import { authClient } from "@/features/auth/api/auth-client";
import { isMobileViewport } from "@/utils/mobile-viewport";

export const redirectMobileGuest = async () => {
  if (!isMobileViewport()) {
    return;
  }

  const session = await authClient.getSession();

  if (!session.data) {
    throw redirect({ to: "/login" });
  }
};
