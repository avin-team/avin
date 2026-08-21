import {
  marketplaceAccessControl,
  marketplaceRoles,
} from "@avin/auth/permissions";
import { adminClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { serverURL } from "@/utils/server-url";

export const providerAuthClient = createAuthClient({
  basePath: "/api/provider-auth",
  baseURL: serverURL,
  plugins: [
    adminClient({
      ac: marketplaceAccessControl,
      roles: marketplaceRoles,
    }),
    twoFactorClient({
      twoFactorPage: "/provider/two-factor",
    }),
  ],
  user: {
    additionalFields: {
      hasSeenSellerOnboarding: {
        type: "boolean",
      },
    },
  },
});
