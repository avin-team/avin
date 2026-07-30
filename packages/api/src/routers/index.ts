import { isSupabaseAccessRole } from "@avin/auth/supabase-access-token";
import { createSupabaseAccessTokenFromEnvironment } from "@avin/auth/supabase-access-token-from-environment";
import type { RouterClient } from "@orpc/server";
import { ORPCError } from "@orpc/server";

import {
  buyerProcedure,
  protectedProcedure,
  publicProcedure,
} from "../authorization";
import { catalogRouter } from "./catalog";
import { categoryRouter } from "./category";
import { sellerRouter } from "./seller";

export const appRouter = {
  catalog: catalogRouter,
  category: categoryRouter,
  healthCheck: publicProcedure.handler(() => "OK"),
  seller: sellerRouter,
  privateData: buyerProcedure.handler(({ context }) => ({
    message: "This is private",
    user: context.session?.user,
  })),
  supabaseAccessToken: protectedProcedure.handler(async ({ context }) => {
    const { id: userId, role } = context.session.user;
    if (!isSupabaseAccessRole(role)) {
      throw new ORPCError("FORBIDDEN");
    }

    return {
      token: await createSupabaseAccessTokenFromEnvironment({
        accountRole: role,
        userId,
      }),
    };
  }),
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
