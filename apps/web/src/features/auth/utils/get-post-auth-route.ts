import { ACCOUNT_ROLE } from "@avin/auth/permissions";

export type PostAuthRoute = "/" | "/dashboard" | "/security";

export const getPostAuthRoute = (role?: string | null): PostAuthRoute => {
  if (role === ACCOUNT_ROLE.ADMIN) {
    return "/security";
  }

  if (role === ACCOUNT_ROLE.SELLER) {
    return "/";
  }

  return "/dashboard";
};
