CREATE TABLE "protection_policy_version" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"effective_at" timestamp NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_change" boolean NOT NULL,
	"material_change_metadata" jsonb NOT NULL,
	"membership_fee_amount" integer NOT NULL,
	"minimum_bond_amount" integer NOT NULL,
	"published_at" timestamp DEFAULT now() NOT NULL,
	"published_by_user_id" text,
	"reaccept_deadline_at" timestamp,
	"retention_policy_reference" text NOT NULL,
	"summary" text NOT NULL,
	"terms" text NOT NULL,
	"title" text NOT NULL,
	"version" text NOT NULL,
CONSTRAINT "protection_policy_version_version_unique" UNIQUE("version")
);
--> statement-breakpoint
INSERT INTO "public"."protection_policy_version" (
	"effective_at",
	"material_change",
	"material_change_metadata",
	"membership_fee_amount",
	"minimum_bond_amount",
	"retention_policy_reference",
	"summary",
	"terms",
	"title",
	"version"
) VALUES (
	TIMESTAMP '2026-01-01 00:00:00',
	false,
	'{"changedAreas":[],"rationale":"Initial Avin Check policy baseline."}'::jsonb,
	3000000,
	30000000,
	'LEGAL_DATA_GOVERNANCE_APPROVAL_REQUIRED',
	'Policy nền tảng của chương trình Avin Check dành cho Provider.',
	'Provider phải đáp ứng điều kiện xét duyệt, duy trì thông tin xác minh chính xác, chấp nhận các policy version hiện hành và tuân thủ quy trình Risk Report, Support Review và Bond off-platform.',
	'Protection Program Policy v1',
	'v1.0'
);
--> statement-breakpoint
CREATE TABLE "protection_provider_policy_acceptance" (
	"accepted_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"policy_version_id" uuid NOT NULL,
	"profile_id" uuid,
	"provider_user_id" text NOT NULL,
	"source" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "protection_provider_application" ADD COLUMN "policy_version_id" uuid;--> statement-breakpoint
ALTER TABLE "protection_provider_profile_revision" ADD COLUMN "policy_version_id" uuid;--> statement-breakpoint
ALTER TABLE "protection_provider_profile_version" ADD COLUMN "policy_version_id" uuid;--> statement-breakpoint
ALTER TABLE "protection_provider_risk_incident" ADD COLUMN "policy_version_id" uuid;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD COLUMN "policy_version_id" uuid;--> statement-breakpoint
ALTER TABLE "protection_support_review" ADD COLUMN "policy_version_id" uuid;--> statement-breakpoint
ALTER TABLE "protection_policy_version" ADD CONSTRAINT "protection_policy_version_published_by_user_id_user_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_policy_acceptance" ADD CONSTRAINT "protection_provider_policy_acceptance_policy_version_id_protection_policy_version_id_fk" FOREIGN KEY ("policy_version_id") REFERENCES "public"."protection_policy_version"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_policy_acceptance" ADD CONSTRAINT "protection_provider_policy_acceptance_profile_id_protection_provider_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."protection_provider_profile"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_policy_acceptance" ADD CONSTRAINT "protection_provider_policy_acceptance_provider_user_id_user_id_fk" FOREIGN KEY ("provider_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "protection_policy_version_effective_idx" ON "protection_policy_version" USING btree ("effective_at");--> statement-breakpoint
CREATE INDEX "protection_policy_version_deadline_idx" ON "protection_policy_version" USING btree ("material_change","reaccept_deadline_at");--> statement-breakpoint
CREATE UNIQUE INDEX "protection_provider_policy_acceptance_unique_idx" ON "protection_provider_policy_acceptance" USING btree ("provider_user_id","policy_version_id");--> statement-breakpoint
CREATE INDEX "protection_provider_policy_acceptance_profile_idx" ON "protection_provider_policy_acceptance" USING btree ("profile_id","accepted_at");--> statement-breakpoint
ALTER TABLE "protection_provider_application" ADD CONSTRAINT "protection_provider_application_policy_version_id_protection_policy_version_id_fk" FOREIGN KEY ("policy_version_id") REFERENCES "public"."protection_policy_version"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_profile_revision" ADD CONSTRAINT "protection_provider_profile_revision_policy_version_id_protection_policy_version_id_fk" FOREIGN KEY ("policy_version_id") REFERENCES "public"."protection_policy_version"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_profile_version" ADD CONSTRAINT "protection_provider_profile_version_policy_version_id_protection_policy_version_id_fk" FOREIGN KEY ("policy_version_id") REFERENCES "public"."protection_policy_version"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_risk_incident" ADD CONSTRAINT "protection_provider_risk_incident_policy_version_id_protection_policy_version_id_fk" FOREIGN KEY ("policy_version_id") REFERENCES "public"."protection_policy_version"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_risk_report" ADD CONSTRAINT "protection_risk_report_policy_version_id_protection_policy_version_id_fk" FOREIGN KEY ("policy_version_id") REFERENCES "public"."protection_policy_version"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_support_review" ADD CONSTRAINT "protection_support_review_policy_version_id_protection_policy_version_id_fk" FOREIGN KEY ("policy_version_id") REFERENCES "public"."protection_policy_version"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
UPDATE "public"."protection_provider_application" AS application
SET "policy_version_id" = policy."id"
FROM "public"."protection_policy_version" AS policy
WHERE application."policy_version_id" IS NULL
  AND application."policy_version" = policy."version";
--> statement-breakpoint
UPDATE "public"."protection_provider_profile_revision" AS revision
SET "policy_version_id" = policy."id"
FROM "public"."protection_policy_version" AS policy
WHERE revision."policy_version_id" IS NULL
  AND revision."policy_version" = policy."version";
--> statement-breakpoint
UPDATE "public"."protection_provider_profile_version" AS profile_version
SET "policy_version_id" = application."policy_version_id"
FROM "public"."protection_provider_profile" AS profile
JOIN "public"."protection_provider_application" AS application
  ON application."id" = profile."application_id"
WHERE profile_version."policy_version_id" IS NULL
  AND profile_version."profile_id" = profile."id"
  AND application."policy_version_id" IS NOT NULL;
--> statement-breakpoint
UPDATE "public"."protection_provider_risk_incident" AS incident
SET "policy_version_id" = profile_version."policy_version_id"
FROM "public"."protection_provider_profile_version" AS profile_version
WHERE incident."policy_version_id" IS NULL
  AND incident."provider_profile_version_id" = profile_version."id"
  AND profile_version."policy_version_id" IS NOT NULL;
--> statement-breakpoint
UPDATE "public"."protection_risk_report" AS report
SET "policy_version_id" = incident."policy_version_id"
FROM "public"."protection_provider_risk_incident" AS incident
WHERE report."policy_version_id" IS NULL
  AND report."id" = incident."risk_report_id"
  AND incident."policy_version_id" IS NOT NULL;
--> statement-breakpoint
UPDATE "public"."protection_support_review" AS support_review
SET "policy_version_id" = incident."policy_version_id"
FROM "public"."protection_provider_risk_incident" AS incident
WHERE support_review."policy_version_id" IS NULL
  AND support_review."incident_id" = incident."id"
  AND incident."policy_version_id" IS NOT NULL;
