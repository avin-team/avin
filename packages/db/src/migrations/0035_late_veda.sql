ALTER TABLE "protection_provider_profile_version" ADD COLUMN "payment_account" jsonb;
--> statement-breakpoint
UPDATE "protection_provider_profile_version" AS version
SET "payment_account" = application."payment_account"
FROM "protection_provider_profile" AS profile
INNER JOIN "protection_provider_application" AS application
  ON application."id" = profile."application_id"
WHERE version."profile_id" = profile."id"
  AND version."version_number" = 1;
