export const AUTH_SURFACE_HEADER = "x-avin-auth-surface";

export const AUTH_SURFACE = {
  ADMIN: "admin",
  STOREFRONT: "storefront",
} as const;

export type AuthSurface = (typeof AUTH_SURFACE)[keyof typeof AUTH_SURFACE];

interface ResolveAuthClientBaseURLOptions {
  readonly frontendOrigin: string;
  readonly isProduction: boolean;
  readonly serverURL: string;
}

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

export const resolveAuthClientBaseURL = ({
  frontendOrigin,
  isProduction,
  serverURL,
}: ResolveAuthClientBaseURLOptions): string =>
  isProduction ? frontendOrigin : serverURL;

export const getAuthSurface = (headers: Headers): AuthSurface =>
  headers.get(AUTH_SURFACE_HEADER) === AUTH_SURFACE.ADMIN
    ? AUTH_SURFACE.ADMIN
    : AUTH_SURFACE.STOREFRONT;
