CREATE TYPE "public"."advisor_message_role" AS ENUM('USER', 'ASSISTANT');--> statement-breakpoint
CREATE TYPE "public"."advisor_session_status" AS ENUM('ACTIVE', 'COMPLETED', 'EXPIRED', 'DELETED');--> statement-breakpoint
CREATE TABLE "advisor_consent" (
	"accepted_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"version" text NOT NULL,
	"visitor_capability_hash" text
);
--> statement-breakpoint
CREATE TABLE "advisor_message" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metadata" jsonb,
	"role" "advisor_message_role" NOT NULL,
	"sequence" integer NOT NULL,
	"session_id" uuid NOT NULL,
	"text" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "advisor_recommendation" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"payload" jsonb NOT NULL,
	"playbook_id" uuid NOT NULL,
	"session_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "advisor_session" (
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"consent_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"last_idempotency_key" text,
	"last_turn_response" jsonb,
	"pending_question_id" text,
	"pinned_playbook_id" uuid,
	"pinned_sub_category_id" uuid,
	"service_need" text DEFAULT '' NOT NULL,
	"status" "advisor_session_status" DEFAULT 'ACTIVE' NOT NULL,
	"turn_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text,
	"visitor_capability_hash" text
);
--> statement-breakpoint
ALTER TABLE "advisor_consent" ADD CONSTRAINT "advisor_consent_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_message" ADD CONSTRAINT "advisor_message_session_id_advisor_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."advisor_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_recommendation" ADD CONSTRAINT "advisor_recommendation_playbook_id_advisor_playbook_id_fk" FOREIGN KEY ("playbook_id") REFERENCES "public"."advisor_playbook"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_recommendation" ADD CONSTRAINT "advisor_recommendation_session_id_advisor_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."advisor_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_session" ADD CONSTRAINT "advisor_session_consent_id_advisor_consent_id_fk" FOREIGN KEY ("consent_id") REFERENCES "public"."advisor_consent"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_session" ADD CONSTRAINT "advisor_session_pinned_playbook_id_advisor_playbook_id_fk" FOREIGN KEY ("pinned_playbook_id") REFERENCES "public"."advisor_playbook"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_session" ADD CONSTRAINT "advisor_session_pinned_sub_category_id_sub_category_id_fk" FOREIGN KEY ("pinned_sub_category_id") REFERENCES "public"."sub_category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_session" ADD CONSTRAINT "advisor_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "advisor_consent_user_idx" ON "advisor_consent" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "advisor_consent_visitor_capability_idx" ON "advisor_consent" USING btree ("visitor_capability_hash");--> statement-breakpoint
CREATE INDEX "advisor_consent_version_idx" ON "advisor_consent" USING btree ("version");--> statement-breakpoint
CREATE INDEX "advisor_message_session_sequence_idx" ON "advisor_message" USING btree ("session_id","sequence");--> statement-breakpoint
CREATE INDEX "advisor_recommendation_session_current_idx" ON "advisor_recommendation" USING btree ("session_id","is_current");--> statement-breakpoint
CREATE INDEX "advisor_recommendation_playbook_idx" ON "advisor_recommendation" USING btree ("playbook_id");--> statement-breakpoint
CREATE INDEX "advisor_session_user_status_idx" ON "advisor_session" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "advisor_session_visitor_status_idx" ON "advisor_session" USING btree ("visitor_capability_hash","status");--> statement-breakpoint
CREATE INDEX "advisor_session_expires_at_idx" ON "advisor_session" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "advisor_session_pinned_playbook_idx" ON "advisor_session" USING btree ("pinned_playbook_id");