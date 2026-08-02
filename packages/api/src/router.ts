import type { RouterClient } from "@orpc/server";

import { commerceRouter } from "./commerce/router";
import { listingRouter } from "./listing/router";
import { sellerApplicationRouter } from "./seller-application/router";
import { sellerStoreRouter } from "./seller-store/router";
import { walletRouter } from "./wallet/router";

export const appRouter = {
  commerce: commerceRouter,
  listing: listingRouter,
  sellerApplication: sellerApplicationRouter,
  sellerStore: sellerStoreRouter,
  wallet: walletRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
