export const AUTH_SURFACE_HEADER = "x-avin-auth-surface";

export const AUTH_SURFACE = {
  ADMIN: "admin",
  STOREFRONT: "storefront",
} as const;

export type AuthSurface = (typeof AUTH_SURFACE)[keyof typeof AUTH_SURFACE];

export const AUTH_SURFACES = {
  [AUTH_SURFACE.STOREFRONT]: {
    basePath: "/api/auth",
    cookiePrefix: "avin-storefront",
    errorPath: "/login",
  },
  [AUTH_SURFACE.ADMIN]: {
    basePath: "/api/admin-auth",
    cookiePrefix: "avin-admin",
    errorPath: "/sign-in",
  },
} as const satisfies Record<
  AuthSurface,
  { basePath: string; cookiePrefix: string; errorPath: string }
>;

export const getAuthSurface = (headers: Headers): AuthSurface => {
  const requestedSurface = headers.get(AUTH_SURFACE_HEADER);

  if (requestedSurface === AUTH_SURFACE.ADMIN) {
    return AUTH_SURFACE.ADMIN;
  }

  return AUTH_SURFACE.STOREFRONT;
};
