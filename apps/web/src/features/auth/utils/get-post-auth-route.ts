import { ACCOUNT_ROLE } from "@avin/auth/permissions";

export type PostAuthRoute = "/" | "/seller/onboarding";

export const getPostAuthRoute = (
  role?: string | null,
  hasSeenSellerOnboarding?: boolean | null
): PostAuthRoute => {
  if (role === ACCOUNT_ROLE.SELLER && !hasSeenSellerOnboarding) {
    return "/seller/onboarding";
  }
  return "/";
};
