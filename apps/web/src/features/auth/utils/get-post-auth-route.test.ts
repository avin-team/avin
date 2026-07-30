import { describe, expect, it } from "vitest";

import { getPostAuthRoute } from "@/features/auth/utils/get-post-auth-route";

describe("getPostAuthRoute", () => {
  it("routes all users to /", () => {
    expect(getPostAuthRoute("buyer")).toBe("/");
    expect(getPostAuthRoute("seller")).toBe("/");
    expect(getPostAuthRoute(null)).toBe("/");
    expect(getPostAuthRoute()).toBe("/");
  });
});
