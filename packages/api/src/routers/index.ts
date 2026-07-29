import type { RouterClient } from "@orpc/server";

import { buyerProcedure, publicProcedure } from "../authorization";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => "OK"),
  privateData: buyerProcedure.handler(({ context }) => ({
    message: "This is private",
    user: context.session?.user,
  })),
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
