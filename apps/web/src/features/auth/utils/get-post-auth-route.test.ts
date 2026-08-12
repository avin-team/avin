import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import { describe, expect, it } from "vitest";

import { getPostAuthRoute } from "@/features/auth/utils/get-post-auth-route";

describe("getPostAuthRoute", () => {
  it("routes buyers to /", () => {
    expect(getPostAuthRoute(ACCOUNT_ROLE.BUYER)).toBe("/");
    expect(getPostAuthRoute(ACCOUNT_ROLE.BUYER, false)).toBe("/");
    expect(getPostAuthRoute(ACCOUNT_ROLE.BUYER, true)).toBe("/");
  });

  it("routes sellers without onboarding seen to /seller/onboarding", () => {
    expect(getPostAuthRoute(ACCOUNT_ROLE.SELLER, false)).toBe(
      "/seller/onboarding"
    );
    expect(getPostAuthRoute(ACCOUNT_ROLE.SELLER)).toBe("/seller/onboarding");
  });

  it("routes sellers with onboarding seen to /", () => {
    expect(getPostAuthRoute(ACCOUNT_ROLE.SELLER, true)).toBe("/");
  });

  it("routes null/undefined role to /", () => {
    expect(getPostAuthRoute(null)).toBe("/");
    expect(getPostAuthRoute()).toBe("/");
  });
});
