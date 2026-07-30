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
} from "better-auth/api";
import { admin, twoFactor } from "better-auth/plugins";
import { Resend } from "resend";

import {
  ACCOUNT_ROLE,
  adminRequiresTwoFactor,
  marketplaceAccessControl,
  marketplaceRoles,
} from "./permissions";

export const createAuth = () => {
  const db = createDb();
  const isProduction = env.NODE_ENV === "production";
  const resend = new Resend(env.RESEND_API_KEY);

  return betterAuth({
    advanced: {
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: isProduction ? "none" : "lax",
        secure: isProduction,
      },
    },
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, {
      provider: "pg",

      schema,
    }),
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
  });
};

export const auth = createAuth();
