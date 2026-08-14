import {
  marketplaceAccessControl,
  marketplaceRoles,
} from "@avin/auth/permissions";
import { adminClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { serverURL } from "./server-url";

export const authClient = createAuthClient({
  basePath: "/api/admin-auth",
  baseURL: serverURL,
  plugins: [
    adminClient({
      ac: marketplaceAccessControl,
      roles: marketplaceRoles,
    }),
    twoFactorClient({
      twoFactorPage: "/two-factor",
    }),
  ],
});

export const { useSession, signIn, signOut } = authClient;
