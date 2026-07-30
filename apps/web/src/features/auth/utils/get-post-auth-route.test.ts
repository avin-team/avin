import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import { describe, expect, it } from "vitest";

import { getPostAuthRoute } from "@/features/auth/utils/get-post-auth-route";

describe("getPostAuthRoute", () => {
  it("routes Buyer to /dashboard", () => {
    expect(getPostAuthRoute(ACCOUNT_ROLE.BUYER)).toBe("/dashboard");
  });

  it("routes Seller to /", () => {
    expect(getPostAuthRoute(ACCOUNT_ROLE.SELLER)).toBe("/");
  });

  it("routes Admin to /security", () => {
    expect(getPostAuthRoute(ACCOUNT_ROLE.ADMIN)).toBe("/security");
  });

  it("defaults to /dashboard for null or undefined role", () => {
    expect(getPostAuthRoute(null)).toBe("/dashboard");
    expect(getPostAuthRoute()).toBe("/dashboard");
  });
});
