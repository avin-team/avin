UPDATE "protection_provider_application"
SET "official_channels" = "official_channels" - 'hotline'
WHERE "official_channels" ? 'hotline';--> statement-breakpoint
UPDATE "protection_provider_profile"
SET "official_channels" = "official_channels" - 'hotline'
WHERE "official_channels" ? 'hotline';--> statement-breakpoint
UPDATE "protection_provider_profile_revision"
SET "official_channels" = "official_channels" - 'hotline'
WHERE "official_channels" ? 'hotline';--> statement-breakpoint
UPDATE "protection_provider_profile_version"
SET "official_channels" = "official_channels" - 'hotline'
WHERE "official_channels" ? 'hotline';
