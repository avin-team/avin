import {
  marketplaceAccessControl,
  marketplaceRoles,
} from "@avin/auth/permissions";
import { env } from "@avin/env/web";
import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: env.VITE_SERVER_URL,
  plugins: [
    adminClient({
      ac: marketplaceAccessControl,
      roles: marketplaceRoles,
    }),
  ],
});

export const { useSession, signIn, signOut } = authClient;
