import { describe, expect, it } from "vitest";

import {
  AUTH_SURFACE,
  AUTH_SURFACE_HEADER,
  AUTH_SURFACES,
  getAuthSurface,
} from "./auth-surfaces";

describe("AUTH_SURFACES", () => {
  it("uses distinct Better Auth routes and cookie namespaces", () => {
    const { storefront } = AUTH_SURFACES;
    const { admin } = AUTH_SURFACES;
    const { provider } = AUTH_SURFACES;

    expect(storefront.basePath).not.toBe(admin.basePath);
    expect(storefront.basePath).not.toBe(provider.basePath);
    expect(storefront.cookiePrefix).not.toBe(admin.cookiePrefix);
    expect(storefront.cookiePrefix).not.toBe(provider.cookiePrefix);
    expect(storefront.errorPath).toBe("/login");
    expect(admin.errorPath).toBe("/sign-in");
    expect(provider.errorPath).toBe("/provider/login");
  });

  it("selects the admin namespace only for an explicit admin request", () => {
    expect(
      getAuthSurface(new Headers([[AUTH_SURFACE_HEADER, AUTH_SURFACE.ADMIN]]))
    ).toBe(AUTH_SURFACE.ADMIN);
    expect(
      getAuthSurface(
        new Headers([[AUTH_SURFACE_HEADER, AUTH_SURFACE.PROVIDER]])
      )
    ).toBe(AUTH_SURFACE.PROVIDER);
    expect(getAuthSurface(new Headers())).toBe(AUTH_SURFACE.STOREFRONT);
  });
});
