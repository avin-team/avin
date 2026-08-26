CREATE TYPE "public"."protection_provider_application_status" AS ENUM('DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."protection_provider_profile_status" AS ENUM('ACTIVE', 'SUSPENDED_PENDING_REVIEW', 'WITHDRAWAL_PENDING', 'WITHDRAWN', 'REMOVED_FOR_FRAUD');--> statement-breakpoint
CREATE TABLE "protection_provider_application" (
	"age_evidence_reference" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"full_name" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identity_evidence_reference" text,
	"official_channel_evidence_reference" text,
	"official_channels" jsonb,
	"operating_history_evidence_reference" text,
	"operating_since" date,
	"payment_account" jsonb,
	"payment_disclosure_consent" boolean,
	"payment_evidence_reference" text,
	"policy_accepted_at" timestamp,
	"policy_version" text,
	"provider_user_id" text NOT NULL,
	"review_reason" text,
	"reviewed_at" timestamp,
	"reviewed_by_user_id" text,
	"revision_count" integer DEFAULT 0 NOT NULL,
	"services" text,
	"status" "protection_provider_application_status" DEFAULT 'DRAFT' NOT NULL,
	"submitted_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "protection_provider_application_provider_user_id_unique" UNIQUE("provider_user_id")
);
--> statement-breakpoint
CREATE TABLE "protection_provider_profile" (
	"application_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"display_name" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"official_channels" jsonb NOT NULL,
	"profile_slug" text NOT NULL,
	"provider_user_id" text NOT NULL,
	"published_at" timestamp DEFAULT now() NOT NULL,
	"services" text NOT NULL,
	"status" "protection_provider_profile_status" DEFAULT 'ACTIVE' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"verified_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "protection_provider_profile_application_id_unique" UNIQUE("application_id"),
	CONSTRAINT "protection_provider_profile_provider_user_id_unique" UNIQUE("provider_user_id")
);
--> statement-breakpoint
ALTER TABLE "protection_provider_application" ADD CONSTRAINT "protection_provider_application_provider_user_id_user_id_fk" FOREIGN KEY ("provider_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_application" ADD CONSTRAINT "protection_provider_application_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_profile" ADD CONSTRAINT "protection_provider_profile_application_id_protection_provider_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."protection_provider_application"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_profile" ADD CONSTRAINT "protection_provider_profile_provider_user_id_user_id_fk" FOREIGN KEY ("provider_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "protection_provider_application_status_idx" ON "protection_provider_application" USING btree ("status");--> statement-breakpoint
CREATE INDEX "protection_provider_application_submitted_idx" ON "protection_provider_application" USING btree ("submitted_at");--> statement-breakpoint
CREATE INDEX "protection_provider_application_reviewer_idx" ON "protection_provider_application" USING btree ("reviewed_by_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "protection_provider_profile_slug_idx" ON "protection_provider_profile" USING btree ("profile_slug");--> statement-breakpoint
CREATE INDEX "protection_provider_profile_status_idx" ON "protection_provider_profile" USING btree ("status");