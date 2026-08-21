import { createDb } from "@avin/db";
import { auditLog } from "@avin/db/schema/auth";
import * as schema from "@avin/db/schema/auth";
import { env } from "@avin/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  APIError,
  createAuthMiddleware,
  getAuthoritativeSessionFromCtx,
  getOAuthState,
} from "better-auth/api";
import { admin, twoFactor } from "better-auth/plugins";
import { Resend } from "resend";

import { AUTH_SURFACE, AUTH_SURFACES } from "./auth-surfaces";
import type { AuthSurface } from "./auth-surfaces";
import {
  ACCOUNT_ROLE,
  adminRequiresTwoFactor,
  marketplaceAccessControl,
  marketplaceRoles,
} from "./permissions";

export const createAuth = (surface: AuthSurface = "storefront") => {
  const db = createDb();
  const isProduction = env.NODE_ENV === "production";
  const resend = new Resend(env.RESEND_API_KEY);
  const { basePath, cookiePrefix, errorPath } = AUTH_SURFACES[surface];
  const allowedHosts = [
    ...new Set(
      [...env.CORS_ORIGIN, env.BETTER_AUTH_URL].map(
        (origin) => new URL(origin).host
      )
    ),
  ];

  return betterAuth({
    advanced: {
      cookiePrefix,
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction,
      },
      trustedProxyHeaders: true,
    },
    basePath,
    baseURL: {
      allowedHosts,
      protocol: "auto",
    },
    database: drizzleAdapter(db, {
      provider: "pg",

      schema,
    }),
    databaseHooks: {
      user: {
        create: {
          before: async (data) => {
            if (surface === AUTH_SURFACE.PROVIDER) {
              return { data: { ...data, role: ACCOUNT_ROLE.PROVIDER } };
            }

            // For Google (OAuth) sign-up: the client passes the intended role
            // via additionalData which is stored in the OAuth state.
            // The admin plugin defaults to BUYER, so we override here
            // for users who chose SELLER during registration.
            let oauthState: Awaited<ReturnType<typeof getOAuthState>> = null;
            try {
              oauthState = await getOAuthState();
            } catch {
              // Not an OAuth flow (e.g. email sign-up) — ignore
            }
            const intendedRole =
              typeof oauthState?.role === "string" ? oauthState.role : null;
            const allowedRoles = [
              ACCOUNT_ROLE.BUYER,
              ACCOUNT_ROLE.SELLER,
            ] as string[];
            if (intendedRole && allowedRoles.includes(intendedRole)) {
              return { data: { ...data, role: intendedRole } };
            }
            return { data };
          },
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
    },
    emailVerification: {
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60 * 24,
      sendOnSignIn: true,
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user, url }) => {
        const { error } = await resend.emails.send({
          from: env.RESEND_FROM_EMAIL,
          html: `<p>Xin chào ${user.name},</p><p>Vui lòng xác minh email để hoàn tất đăng ký tài khoản Avin.</p><p><a href="${url}">Xác minh email</a></p><p>Liên kết có hiệu lực trong 24 giờ.</p>`,
          subject: "Xác minh email Avin",
          to: user.email,
        });
        if (error) {
          throw new Error(
            `Unable to send verification email: ${error.message}`
          );
        }
      },
    },
    hooks: {
      after: createAuthMiddleware(async (context) => {
        if (!context.path.startsWith("/admin/")) {
          return;
        }

        const actorUserId = context.context.session?.user.id;
        if (!actorUserId) {
          return;
        }

        const targetId =
          typeof context.body?.userId === "string"
            ? context.body.userId
            : undefined;
        await db.insert(auditLog).values({
          action: `better-auth${context.path}`,
          actorUserId,
          metadata: {
            requestMethod: context.request?.method,
          },
          outcome:
            context.context.returned instanceof APIError
              ? "FAILURE"
              : "SUCCESS",
          targetId,
          targetType: targetId ? "USER" : undefined,
        });
      }),
      before: createAuthMiddleware(async (context) => {
        // Preserve the client-sent role during email sign-up.
        // The admin plugin defaults every new user to BUYER; we override
        // that by re-injecting the validated role into the request body
        // so the admin plugin picks it up correctly.
        if (context.path === "/sign-up/email") {
          if (surface === AUTH_SURFACE.PROVIDER) {
            return {
              context: {
                ...context,
                body: {
                  ...context.body,
                  role: ACCOUNT_ROLE.PROVIDER,
                },
              },
            };
          }

          const allowedRoles = [
            ACCOUNT_ROLE.BUYER,
            ACCOUNT_ROLE.SELLER,
          ] as string[];
          const bodyRole =
            typeof context.body?.role === "string" ? context.body.role : null;
          if (bodyRole && allowedRoles.includes(bodyRole)) {
            return {
              context: {
                ...context,
                body: {
                  ...context.body,
                  role: bodyRole,
                },
              },
            };
          }
        }

        // Admin 2FA enforcement
        const { request } = context;
        if (!context.path.startsWith("/admin/") || !request) {
          return;
        }

        const adminSession = await getAuthoritativeSessionFromCtx(context);
        const actor = adminSession?.user;
        if (!adminRequiresTwoFactor(actor)) {
          return;
        }

        await db.insert(auditLog).values({
          action: `better-auth${context.path}`,
          actorUserId: actor.id,
          metadata: {
            reason: "TWO_FACTOR_REQUIRED",
            requestMethod: request.method,
          },
          outcome: "FAILURE",
        });
        throw new APIError("FORBIDDEN", {
          message: "Two-factor authentication is required for Admin access.",
        });
      }),
    },
    onAPIError: {
      errorURL: errorPath,
    },
    plugins: [
      admin({
        ac: marketplaceAccessControl,
        defaultRole: ACCOUNT_ROLE.BUYER,
        roles: marketplaceRoles,
      }),
      twoFactor({
        allowPasswordless: true,
        issuer: "Avin",
      }),
    ],
    secret: env.BETTER_AUTH_SECRET,
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        prompt: "select_account",
      },
    },
    trustedOrigins: env.CORS_ORIGIN,
    user: {
      additionalFields: {
        hasSeenSellerOnboarding: {
          defaultValue: false,
          required: false,
          type: "boolean",
        },
      },
    },
  });
};

export const auth = createAuth();
export const adminAuth = createAuth("admin");
export const providerAuth = createAuth(AUTH_SURFACE.PROVIDER);
