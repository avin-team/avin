import { describe, expect, it } from "vitest";

import {
  AUTH_SURFACE,
  AUTH_SURFACE_HEADER,
  AUTH_SURFACES,
  getAuthSurface,
  resolveAuthClientBaseURL,
} from "./auth-surfaces";

describe("AUTH_SURFACES", () => {
  it("uses distinct Better Auth routes and cookie namespaces", () => {
    const { storefront } = AUTH_SURFACES;
    const { admin } = AUTH_SURFACES;

    expect(storefront.basePath).not.toBe(admin.basePath);
    expect(storefront.cookiePrefix).not.toBe(admin.cookiePrefix);
    expect(storefront.errorPath).toBe("/login");
    expect(admin.errorPath).toBe("/sign-in");
  });

  it("keeps production auth requests on the frontend origin", () => {
    expect(
      resolveAuthClientBaseURL({
        frontendOrigin: "https://www.avin05.com",
        isProduction: true,
        serverURL: "https://avin-server-two.vercel.app",
      })
    ).toBe("https://www.avin05.com");

    expect(
      resolveAuthClientBaseURL({
        frontendOrigin: "http://localhost:3001",
        isProduction: false,
        serverURL: "http://localhost:3000",
      })
    ).toBe("http://localhost:3000");
  });

  it("selects the admin namespace only for an explicit admin request", () => {
    expect(
      getAuthSurface(new Headers([[AUTH_SURFACE_HEADER, AUTH_SURFACE.ADMIN]]))
    ).toBe(AUTH_SURFACE.ADMIN);
    expect(getAuthSurface(new Headers())).toBe(AUTH_SURFACE.STOREFRONT);
  });
});
