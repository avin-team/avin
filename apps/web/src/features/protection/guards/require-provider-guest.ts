import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import { redirect } from "@tanstack/react-router";

import { providerAuthClient } from "../api/provider-auth-client";

export const requireProviderGuest = async () => {
  const session = await providerAuthClient.getSession();

  if (session.data?.user.role === ACCOUNT_ROLE.PROVIDER) {
    throw redirect({
      to: "/provider",
    });
  }
};
