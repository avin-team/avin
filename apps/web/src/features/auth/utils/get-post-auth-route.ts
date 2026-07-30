import { ACCOUNT_ROLE } from "@avin/auth/permissions";

export type PostAuthRoute = "/" | "/dashboard";

export const getPostAuthRoute = (role?: string | null): PostAuthRoute => {
  if (role === ACCOUNT_ROLE.SELLER) {
    return "/";
  }

  return "/dashboard";
};
