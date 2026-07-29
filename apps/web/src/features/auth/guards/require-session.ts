import { redirect } from "@tanstack/react-router";

import { authClient } from "@/features/auth/api/auth-client";

export const requireSession = async () => {
  const session = await authClient.getSession();

  if (!session.data) {
    redirect({
      throw: true,
      to: "/login",
    });
  }

  return session;
};
