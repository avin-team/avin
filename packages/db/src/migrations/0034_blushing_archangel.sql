CREATE TYPE "public"."advisor_generation_status" AS ENUM('IDLE', 'RUNNING', 'STOPPED', 'FAILED');--> statement-breakpoint
ALTER TABLE "advisor_session" ADD COLUMN "generation_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "advisor_session" ADD COLUMN "generation_status" "advisor_generation_status" DEFAULT 'IDLE' NOT NULL;--> statement-breakpoint
CREATE INDEX "advisor_session_generation_status_idx" ON "advisor_session" USING btree ("generation_status");