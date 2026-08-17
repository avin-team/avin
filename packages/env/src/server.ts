import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  emptyStringAsUndefined: true,
  runtimeEnv: process.env,
  server: {
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z
      .string()
      .min(1)
      .transform((val) => val.split(",").map((url) => url.trim())),
    DATABASE_URL: z.string().min(1),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    GROQ_API_KEY: z.string().min(1).optional(),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    RESEND_API_KEY: z.string().min(1),
    RESEND_FROM_EMAIL: z.email(),
    SEPAY_API_TOKEN: z.string().min(1).optional(),
    SEPAY_BANK_ACCOUNT: z.string().min(1).optional(),
    SEPAY_BANK_ACCOUNT_NAME: z.string().min(1).optional(),
    SEPAY_BANK_CODE: z.string().min(1).optional(),
    SEPAY_TRANSACTIONS_API_URL: z.url().optional(),
    SEPAY_WEBHOOK_SECRET: z.string().min(1).optional(),
    SEPAY_WEBHOOK_TIMESTAMP_WINDOW_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(300),
    SUPABASE_JWT_PRIVATE_JWK: z.string().min(1),
    SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
    SUPABASE_SECRET_KEY: z.string().min(1),
    SUPABASE_STORAGE_S3_ACCESS_KEY_ID: z.string().min(1).optional(),
    SUPABASE_STORAGE_S3_ENDPOINT: z.url().optional(),
    SUPABASE_STORAGE_S3_REGION: z.string().min(1).optional(),
    SUPABASE_STORAGE_S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    SUPABASE_URL: z.url(),
  },
});
