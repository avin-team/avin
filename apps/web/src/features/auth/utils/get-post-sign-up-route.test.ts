import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import { describe, expect, it } from "vitest";

import { getPostSignUpRoute } from "@/features/auth/utils/get-post-sign-up-route";

describe("getPostSignUpRoute", () => {
  it("routes a newly registered seller to onboarding", () => {
    expect(getPostSignUpRoute(ACCOUNT_ROLE.SELLER)).toBe("/seller/onboarding");
  });

  it("routes a newly registered buyer to home", () => {
    expect(getPostSignUpRoute(ACCOUNT_ROLE.BUYER)).toBe("/");
  });
});
