import { createFileRoute, redirect } from "@tanstack/react-router";

import { SecurityPage } from "@/components/security-page";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/security")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({
        throw: true,
        to: "/login",
      });
    }
  },
  component: SecurityPage,
});
