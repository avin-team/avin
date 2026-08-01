import type { RouterClient } from "@orpc/server";

import { listingRouter } from "./listing/router";
import { sellerApplicationRouter } from "./seller-application/router";
import { sellerStoreRouter } from "./seller-store/router";

export const appRouter = {
  listing: listingRouter,
  sellerApplication: sellerApplicationRouter,
  sellerStore: sellerStoreRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
