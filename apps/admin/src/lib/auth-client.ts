import { resolveAuthClientBaseURL } from "@avin/auth/auth-surfaces";
import {
  marketplaceAccessControl,
  marketplaceRoles,
} from "@avin/auth/permissions";
import { env } from "@avin/env/web";
import { adminClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  basePath: "/api/admin-auth",
  baseURL: resolveAuthClientBaseURL({
    frontendOrigin: window.location.origin,
    isProduction: import.meta.env.PROD,
    serverURL: env.VITE_SERVER_URL,
  }),
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
