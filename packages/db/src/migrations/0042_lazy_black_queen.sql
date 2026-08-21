CREATE TYPE "public"."protection_provider_bond_adjustment_kind" AS ENUM('DEPOSIT', 'WITHDRAWAL', 'SUPPORT_ALLOCATION', 'CORRECTION');--> statement-breakpoint
CREATE TYPE "public"."protection_provider_bond_adjustment_status" AS ENUM('APPLIED', 'PENDING_APPROVAL', 'REJECTED');--> statement-breakpoint
CREATE TABLE "protection_provider_bond_account" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_profile_id" uuid NOT NULL,
	"provider_user_id" text NOT NULL,
	"recognized_amount" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "protection_provider_bond_account_provider_profile_id_unique" UNIQUE("provider_profile_id"),
	CONSTRAINT "protection_provider_bond_account_provider_user_id_unique" UNIQUE("provider_user_id")
);
--> statement-breakpoint
CREATE TABLE "protection_provider_bond_adjustment" (
	"approval_reason" text,
	"approved_at" timestamp,
	"approved_by_user_id" text,
	"balance_after" integer,
	"balance_before" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"delta_amount" integer NOT NULL,
	"evidence_reference" text,
	"external_bank_reference" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" text NOT NULL,
	"kind" "protection_provider_bond_adjustment_kind" NOT NULL,
	"profile_id" uuid NOT NULL,
	"provider_user_id" text NOT NULL,
	"reason" text NOT NULL,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"recorded_by_user_id" text NOT NULL,
	"source_id" text,
	"source_type" text,
	"status" "protection_provider_bond_adjustment_status" DEFAULT 'PENDING_APPROVAL' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "protection_provider_profile_version" ADD COLUMN "recommended_transaction_limit" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "protection_provider_bond_account" ADD CONSTRAINT "protection_provider_bond_account_provider_profile_id_protection_provider_profile_id_fk" FOREIGN KEY ("provider_profile_id") REFERENCES "public"."protection_provider_profile"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_bond_account" ADD CONSTRAINT "protection_provider_bond_account_provider_user_id_user_id_fk" FOREIGN KEY ("provider_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_bond_adjustment" ADD CONSTRAINT "protection_provider_bond_adjustment_approved_by_user_id_user_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_bond_adjustment" ADD CONSTRAINT "protection_provider_bond_adjustment_profile_id_protection_provider_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."protection_provider_profile"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_bond_adjustment" ADD CONSTRAINT "protection_provider_bond_adjustment_provider_user_id_user_id_fk" FOREIGN KEY ("provider_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_bond_adjustment" ADD CONSTRAINT "protection_provider_bond_adjustment_recorded_by_user_id_user_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "protection_provider_bond_account_profile_idx" ON "protection_provider_bond_account" USING btree ("provider_profile_id");--> statement-breakpoint
CREATE INDEX "protection_provider_bond_account_provider_idx" ON "protection_provider_bond_account" USING btree ("provider_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "protection_provider_bond_adjustment_idempotency_idx" ON "protection_provider_bond_adjustment" USING btree ("profile_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "protection_provider_bond_adjustment_profile_idx" ON "protection_provider_bond_adjustment" USING btree ("profile_id","created_at");--> statement-breakpoint
CREATE INDEX "protection_provider_bond_adjustment_provider_idx" ON "protection_provider_bond_adjustment" USING btree ("provider_user_id","created_at");--> statement-breakpoint
CREATE INDEX "protection_provider_bond_adjustment_status_idx" ON "protection_provider_bond_adjustment" USING btree ("status","created_at");