CREATE TYPE "public"."protection_provider_deposit_intent_kind" AS ENUM('APPLICATION', 'TOP_UP');--> statement-breakpoint
CREATE TYPE "public"."protection_provider_deposit_intent_status" AS ENUM('PENDING', 'MATCHED', 'MANUAL_REVIEW', 'EXPIRED', 'REFUND_PENDING', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."protection_provider_tier" AS ENUM('NORMAL', 'BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'VIP');--> statement-breakpoint
CREATE TABLE "protection_provider_deposit_intent" (
	"amount" integer NOT NULL,
	"application_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "protection_provider_deposit_intent_kind" NOT NULL,
	"matched_at" timestamp,
	"matched_event_id" text,
	"matched_amount" integer,
	"manual_reason" text,
	"payment_code" text NOT NULL,
	"policy_version_id" uuid,
	"profile_id" uuid,
	"provider_user_id" text NOT NULL,
	"status" "protection_provider_deposit_intent_status" DEFAULT 'PENDING' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "protection_provider_deposit_intent_payment_code_unique" UNIQUE("payment_code")
);
--> statement-breakpoint
ALTER TABLE "protection_policy_version" ADD COLUMN "bronze_minimum_bond_amount" integer DEFAULT 5000000 NOT NULL;--> statement-breakpoint
ALTER TABLE "protection_policy_version" ADD COLUMN "diamond_minimum_bond_amount" integer DEFAULT 50000000 NOT NULL;--> statement-breakpoint
ALTER TABLE "protection_policy_version" ADD COLUMN "gold_minimum_bond_amount" integer DEFAULT 20000000 NOT NULL;--> statement-breakpoint
ALTER TABLE "protection_policy_version" ADD COLUMN "recommended_limit_percentage" integer DEFAULT 80 NOT NULL;--> statement-breakpoint
ALTER TABLE "protection_policy_version" ADD COLUMN "recommended_limit_rounding" integer DEFAULT 100000 NOT NULL;--> statement-breakpoint
ALTER TABLE "protection_policy_version" ADD COLUMN "silver_minimum_bond_amount" integer DEFAULT 10000000 NOT NULL;--> statement-breakpoint
ALTER TABLE "protection_policy_version" ADD COLUMN "vip_minimum_bond_amount" integer DEFAULT 100000000 NOT NULL;--> statement-breakpoint
ALTER TABLE "protection_provider_application" ADD COLUMN "bond_amount" integer;--> statement-breakpoint
ALTER TABLE "protection_provider_application" ADD COLUMN "citizen_id_ciphertext" text;--> statement-breakpoint
ALTER TABLE "protection_provider_application" ADD COLUMN "citizen_id_hash" text;--> statement-breakpoint
ALTER TABLE "protection_provider_application" ADD COLUMN "citizen_id_last4" text;--> statement-breakpoint
ALTER TABLE "protection_provider_application" ADD COLUMN "deposit_intent_id" uuid;--> statement-breakpoint
ALTER TABLE "protection_provider_application" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "protection_provider_application" ADD COLUMN "public_data_consent" boolean;--> statement-breakpoint
ALTER TABLE "protection_provider_application" ADD COLUMN "recognized_bond_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "protection_provider_application" ADD COLUMN "registered_bank_accounts" jsonb;--> statement-breakpoint
ALTER TABLE "protection_provider_profile" ADD COLUMN "location" text DEFAULT 'Chưa cập nhật' NOT NULL;--> statement-breakpoint
ALTER TABLE "protection_provider_profile_revision" ADD COLUMN "citizen_id_ciphertext" text;--> statement-breakpoint
ALTER TABLE "protection_provider_profile_revision" ADD COLUMN "citizen_id_hash" text;--> statement-breakpoint
ALTER TABLE "protection_provider_profile_revision" ADD COLUMN "citizen_id_last4" text;--> statement-breakpoint
ALTER TABLE "protection_provider_profile_revision" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "protection_provider_profile_revision" ADD COLUMN "public_data_consent" boolean;--> statement-breakpoint
ALTER TABLE "protection_provider_profile_revision" ADD COLUMN "registered_bank_accounts" jsonb;--> statement-breakpoint
ALTER TABLE "protection_provider_profile_version" ADD COLUMN "location" text DEFAULT 'Chưa cập nhật' NOT NULL;--> statement-breakpoint
ALTER TABLE "protection_provider_profile_version" ADD COLUMN "recognized_bond_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "protection_provider_profile_version" ADD COLUMN "registered_bank_accounts" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "protection_provider_profile_version" ADD COLUMN "tier" "protection_provider_tier" DEFAULT 'NORMAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "sepay_payment_event" ADD COLUMN "provider_deposit_intent_id" uuid;--> statement-breakpoint
UPDATE "protection_policy_version"
SET "minimum_bond_amount" = 1000000,
    "membership_fee_amount" = 0
WHERE "version" = 'v1.0';--> statement-breakpoint
ALTER TABLE "protection_provider_deposit_intent" ADD CONSTRAINT "protection_provider_deposit_intent_application_id_protection_provider_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."protection_provider_application"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_deposit_intent" ADD CONSTRAINT "protection_provider_deposit_intent_policy_version_id_protection_policy_version_id_fk" FOREIGN KEY ("policy_version_id") REFERENCES "public"."protection_policy_version"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_deposit_intent" ADD CONSTRAINT "protection_provider_deposit_intent_profile_id_protection_provider_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."protection_provider_profile"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_deposit_intent" ADD CONSTRAINT "protection_provider_deposit_intent_provider_user_id_user_id_fk" FOREIGN KEY ("provider_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "protection_provider_deposit_intent_application_idx" ON "protection_provider_deposit_intent" USING btree ("application_id","created_at");--> statement-breakpoint
CREATE INDEX "protection_provider_deposit_intent_profile_idx" ON "protection_provider_deposit_intent" USING btree ("profile_id","created_at");--> statement-breakpoint
CREATE INDEX "protection_provider_deposit_intent_provider_status_idx" ON "protection_provider_deposit_intent" USING btree ("provider_user_id","status","created_at");--> statement-breakpoint
CREATE INDEX "protection_provider_deposit_intent_expiry_idx" ON "protection_provider_deposit_intent" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "protection_provider_application_citizen_hash_idx" ON "protection_provider_application" USING btree ("citizen_id_hash");--> statement-breakpoint
CREATE INDEX "protection_provider_application_location_idx" ON "protection_provider_application" USING btree ("location");--> statement-breakpoint
CREATE INDEX "sepay_payment_event_provider_intent_idx" ON "sepay_payment_event" USING btree ("provider_deposit_intent_id");
