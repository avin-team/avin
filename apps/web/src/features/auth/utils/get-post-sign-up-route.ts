import { ACCOUNT_ROLE } from "@avin/auth/permissions";

export type PostSignUpRoute = "/" | "/seller/onboarding";

export const getPostSignUpRoute = (role?: string | null): PostSignUpRoute =>
  role === ACCOUNT_ROLE.SELLER ? "/seller/onboarding" : "/";
