import { describe, expect, it } from "vitest";

import {
  AUTH_SURFACE,
  AUTH_SURFACE_HEADER,
  AUTH_SURFACES,
  getAuthSurface,
} from "./auth-surfaces";

describe("AUTH_SURFACES", () => {
  it("uses separate Admin and marketplace namespaces", () => {
    const { storefront } = AUTH_SURFACES;
    const { admin } = AUTH_SURFACES;

    expect(Object.keys(AUTH_SURFACES)).toEqual(["storefront", "admin"]);
    expect(storefront.basePath).not.toBe(admin.basePath);
    expect(storefront.cookiePrefix).not.toBe(admin.cookiePrefix);
    expect(storefront.errorPath).toBe("/login");
    expect(admin.errorPath).toBe("/sign-in");
  });

  it("selects the admin namespace only for an explicit admin request", () => {
    expect(
      getAuthSurface(new Headers([[AUTH_SURFACE_HEADER, AUTH_SURFACE.ADMIN]]))
    ).toBe(AUTH_SURFACE.ADMIN);
    expect(
      getAuthSurface(new Headers([[AUTH_SURFACE_HEADER, "provider"]]))
    ).toBe(AUTH_SURFACE.STOREFRONT);
    expect(getAuthSurface(new Headers())).toBe(AUTH_SURFACE.STOREFRONT);
  });
});
