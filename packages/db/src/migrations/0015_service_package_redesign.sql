ALTER TABLE "service_package" RENAME COLUMN "scope" TO "description";--> statement-breakpoint
ALTER TABLE "service_package" DROP COLUMN "service_input_fields";--> statement-breakpoint
UPDATE "service_package" SET "warranty_policy" = "warranty_policy" - 'terms';
