CREATE TYPE "public"."advisor_playbook_status" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "advisor_playbook" (
	"archived_at" timestamp,
	"content" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"last_tested_at" timestamp,
	"published_at" timestamp,
	"scenario_results" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "advisor_playbook_status" DEFAULT 'DRAFT' NOT NULL,
	"sub_category_id" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"version" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "advisor_playbook" ADD CONSTRAINT "advisor_playbook_sub_category_id_sub_category_id_fk" FOREIGN KEY ("sub_category_id") REFERENCES "public"."sub_category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "advisor_playbook_sub_category_version_unique_idx" ON "advisor_playbook" USING btree ("sub_category_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "advisor_playbook_published_sub_category_unique_idx" ON "advisor_playbook" USING btree ("sub_category_id") WHERE "advisor_playbook"."status" = 'PUBLISHED';--> statement-breakpoint
CREATE INDEX "advisor_playbook_sub_category_status_idx" ON "advisor_playbook" USING btree ("sub_category_id","status");