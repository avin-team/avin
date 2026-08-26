import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  emptyStringAsUndefined: true,
  runtimeEnv: process.env,
  server: {
    AVIN_CHECK_AUDIT_DUAL_APPROVAL_VALIDATED: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    AVIN_CHECK_BOND_RECONCILIATION_APPROVED: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    AVIN_CHECK_CORRECTION_REMOVAL_VALIDATED: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    AVIN_CHECK_CUSTODY_APPROVED: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    AVIN_CHECK_DATA_GOVERNANCE_APPROVED: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    AVIN_CHECK_LEGAL_REVIEW_APPROVED: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    AVIN_CHECK_MODE: z
      .enum(["NO_MONEY_PILOT", "LIVE"])
      .default("NO_MONEY_PILOT"),
    AVIN_CHECK_PILOT_EXIT_CRITERIA_APPROVED: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    AVIN_CHECK_PRIVACY_PROJECTIONS_APPROVED: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    AVIN_CHECK_PROGRAM_ENTITY_APPROVED: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    AVIN_CHECK_RISK_REPORT_PUBLICATION_ENABLED: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    AVIN_CHECK_SLA_MEASURABLE: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z
      .string()
      .min(1)
      .transform((val) => val.split(",").map((url) => url.trim())),
    DATABASE_URL: z.string().min(1),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
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
