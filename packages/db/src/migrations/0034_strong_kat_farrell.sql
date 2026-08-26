CREATE TABLE "protection_provider_profile_revision" (
	"age_evidence_reference" text,
	"base_version_id" uuid NOT NULL,
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
	"profile_id" uuid NOT NULL,
	"provider_user_id" text NOT NULL,
	"review_reason" text,
	"reviewed_at" timestamp,
	"reviewed_by_user_id" text,
	"revision_number" integer NOT NULL,
	"services" text,
	"status" "protection_provider_application_status" DEFAULT 'DRAFT' NOT NULL,
	"submitted_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "protection_provider_profile_version" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"display_name" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"official_channels" jsonb NOT NULL,
	"profile_id" uuid NOT NULL,
	"profile_slug" text NOT NULL,
	"published_at" timestamp DEFAULT now() NOT NULL,
	"published_by_user_id" text,
	"services" text NOT NULL,
	"source_application_id" uuid,
	"status" "protection_provider_profile_status" NOT NULL,
	"status_reason" text,
	"verified_at" timestamp DEFAULT now() NOT NULL,
	"version_number" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "protection_provider_profile_revision" ADD CONSTRAINT "protection_provider_profile_revision_base_version_id_protection_provider_profile_version_id_fk" FOREIGN KEY ("base_version_id") REFERENCES "public"."protection_provider_profile_version"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_profile_revision" ADD CONSTRAINT "protection_provider_profile_revision_profile_id_protection_provider_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."protection_provider_profile"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_profile_revision" ADD CONSTRAINT "protection_provider_profile_revision_provider_user_id_user_id_fk" FOREIGN KEY ("provider_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_profile_revision" ADD CONSTRAINT "protection_provider_profile_revision_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_profile_version" ADD CONSTRAINT "protection_provider_profile_version_profile_id_protection_provider_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."protection_provider_profile"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_profile_version" ADD CONSTRAINT "protection_provider_profile_version_published_by_user_id_user_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_profile_version" ADD CONSTRAINT "protection_provider_profile_version_source_application_id_protection_provider_application_id_fk" FOREIGN KEY ("source_application_id") REFERENCES "public"."protection_provider_application"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
INSERT INTO "protection_provider_profile_version" (
	"created_at",
	"display_name",
	"official_channels",
	"profile_id",
	"profile_slug",
	"published_at",
	"services",
	"source_application_id",
	"status",
	"version_number",
	"verified_at"
)
SELECT
	profile."created_at",
	profile."display_name",
	profile."official_channels",
	profile."id",
	profile."profile_slug",
	profile."published_at",
	profile."services",
	profile."application_id",
	profile."status",
	1,
	profile."verified_at"
FROM "protection_provider_profile" AS profile
WHERE NOT EXISTS (
	SELECT 1
	FROM "protection_provider_profile_version" AS version
	WHERE version."profile_id" = profile."id"
);--> statement-breakpoint
CREATE OR REPLACE FUNCTION "protection_provider_profile_version_immutable"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'Provider profile versions are immutable';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "protection_provider_profile_version_immutable_trigger"
BEFORE UPDATE OR DELETE ON "protection_provider_profile_version"
FOR EACH ROW
EXECUTE FUNCTION "protection_provider_profile_version_immutable"();--> statement-breakpoint
CREATE UNIQUE INDEX "protection_provider_profile_revision_number_idx" ON "protection_provider_profile_revision" USING btree ("profile_id","revision_number");--> statement-breakpoint
CREATE INDEX "protection_provider_profile_revision_status_idx" ON "protection_provider_profile_revision" USING btree ("status");--> statement-breakpoint
CREATE INDEX "protection_provider_profile_revision_submitted_idx" ON "protection_provider_profile_revision" USING btree ("submitted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "protection_provider_profile_version_number_idx" ON "protection_provider_profile_version" USING btree ("profile_id","version_number");--> statement-breakpoint
CREATE INDEX "protection_provider_profile_version_slug_idx" ON "protection_provider_profile_version" USING btree ("profile_slug");
