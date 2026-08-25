ALTER TABLE "protection_provider_application" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "protection_provider_application" ADD COLUMN "source" text DEFAULT 'AVIN_NATIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "protection_provider_profile" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "protection_provider_profile" ADD COLUMN "source" text DEFAULT 'AVIN_NATIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "protection_provider_profile_revision" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "protection_provider_profile_revision" ADD COLUMN "source" text DEFAULT 'AVIN_NATIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "protection_provider_profile_version" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "protection_provider_profile_version" ADD COLUMN "source" text DEFAULT 'AVIN_NATIVE' NOT NULL;