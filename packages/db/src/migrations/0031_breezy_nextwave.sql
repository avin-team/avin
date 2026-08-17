CREATE TYPE "public"."advisor_provider_state" AS ENUM('ACTIVE', 'DISABLED', 'INVALID', 'UNAVAILABLE');--> statement-breakpoint
CREATE TABLE "advisor_provider_config" (
	"contract_verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"disabled_at" timestamp,
	"encrypted_api_key" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key_fingerprint" text NOT NULL,
	"key_last_four" text NOT NULL,
	"last_checked_at" timestamp,
	"last_error_code" text,
	"last_error_message" text,
	"model" text NOT NULL,
	"provider" text DEFAULT 'groq' NOT NULL,
	"state" "advisor_provider_state" DEFAULT 'DISABLED' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"zdr_verified_at" timestamp
);
--> statement-breakpoint
CREATE UNIQUE INDEX "advisor_provider_config_provider_unique_idx" ON "advisor_provider_config" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "advisor_provider_config_state_idx" ON "advisor_provider_config" USING btree ("state");