import type { AppRouterClient } from "@avin/api/router";
import { AUTH_SURFACE, AUTH_SURFACE_HEADER } from "@avin/auth/auth-surfaces";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

import { serverURL } from "@/utils/server-url";

const providerLink = new RPCLink({
  fetch(url, options) {
    return fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        [AUTH_SURFACE_HEADER]: AUTH_SURFACE.PROVIDER,
      },
    });
  },
  url: `${serverURL}/rpc`,
});

export const providerClient: AppRouterClient = createORPCClient(providerLink);

export const providerOrpc = createTanstackQueryUtils(providerClient);
