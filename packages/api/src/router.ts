import type { RouterClient } from "@orpc/server";

import { advisorPlaybookRouter } from "./advisor/playbook-router";
import { advisorRouter } from "./advisor/router";
import { commerceRouter } from "./commerce/router";
import { listingRouter } from "./listing/router";
import { notificationRouter } from "./notifications/router";
import { operationsRouter } from "./operations/router";
import { sellerApplicationRouter } from "./seller-application/router";
import { sellerEnforcementRouter } from "./seller-enforcement/router";
import { sellerStoreRouter } from "./seller-store/router";
import { walletRouter } from "./wallet/router";

export const appRouter = {
  advisor: {
    ...advisorRouter,
    playbook: advisorPlaybookRouter,
  },
  commerce: commerceRouter,
  listing: listingRouter,
  notifications: notificationRouter,
  operations: operationsRouter,
  sellerApplication: sellerApplicationRouter,
  sellerEnforcement: sellerEnforcementRouter,
  sellerStore: sellerStoreRouter,
  wallet: walletRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
