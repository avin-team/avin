import type { AppRouterClient } from "@avin/api/router";
import { AUTH_SURFACE, AUTH_SURFACE_HEADER } from "@avin/auth/auth-surfaces";
import { env } from "@avin/env/web";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

export const link = new RPCLink({
  fetch(url, options) {
    return fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        [AUTH_SURFACE_HEADER]: AUTH_SURFACE.ADMIN,
      },
    });
  },
  url: `${env.VITE_SERVER_URL}/rpc`,
});

export const client: AppRouterClient = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
