import { redirect } from "@tanstack/react-router";

import { authClient } from "@/features/auth/api/auth-client";

export const requireGuest = async () => {
  const session = await authClient.getSession();

  if (session.data) {
    throw redirect({
      to: "/",
    });
  }
};
