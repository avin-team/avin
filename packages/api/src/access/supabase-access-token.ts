import { isSupabaseAccessRole } from "@avin/auth/supabase-access-token";
import { createSupabaseAccessTokenFromEnvironment } from "@avin/auth/supabase-access-token-from-environment";
import { ORPCError } from "@orpc/server";

import type { MarketplaceSession } from "../runtime/context";

export const createSupabaseAccessToken = async (
  user: MarketplaceSession["user"]
): Promise<string> => {
  if (!isSupabaseAccessRole(user.role)) {
    throw new ORPCError("FORBIDDEN");
  }

  return await createSupabaseAccessTokenFromEnvironment({
    accountRole: user.role,
    userId: user.id,
  });
};
