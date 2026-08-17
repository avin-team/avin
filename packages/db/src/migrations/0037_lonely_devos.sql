CREATE TYPE "public"."advisor_analytics_event_type" AS ENUM('ANSWER_SUBMITTED', 'ATTACHMENT_ADDED', 'CHECKOUT_COMPLETED', 'FEEDBACK_SUBMITTED', 'LISTING_CLICKED', 'MODEL_REQUEST', 'NO_MATCH', 'RECOMMENDATION_CREATED', 'RECOMMENDATION_SELECTED', 'SESSION_ABANDONED', 'SESSION_STARTED', 'SUMMARY_COPIED', 'SUMMARY_CONFIRMED', 'TURN_COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."advisor_analytics_retention" AS ENUM('AGGREGATE', 'TECHNICAL');--> statement-breakpoint
CREATE TYPE "public"."advisor_feedback_sentiment" AS ENUM('NEGATIVE', 'POSITIVE');--> statement-breakpoint
CREATE TABLE "advisor_analytics_event" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"event_type" "advisor_analytics_event_type" NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"retention" "advisor_analytics_retention" DEFAULT 'AGGREGATE' NOT NULL,
	"session_id" uuid,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "advisor_feedback" (
	"attachment_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"attachment_consent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reason" text,
	"recommendation_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"sentiment" "advisor_feedback_sentiment" NOT NULL,
	"share_conversation" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text,
	"visitor_capability_hash" text
);
--> statement-breakpoint
ALTER TABLE "advisor_analytics_event" ADD CONSTRAINT "advisor_analytics_event_session_id_advisor_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."advisor_session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_analytics_event" ADD CONSTRAINT "advisor_analytics_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_feedback" ADD CONSTRAINT "advisor_feedback_recommendation_id_advisor_recommendation_id_fk" FOREIGN KEY ("recommendation_id") REFERENCES "public"."advisor_recommendation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_feedback" ADD CONSTRAINT "advisor_feedback_session_id_advisor_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."advisor_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_feedback" ADD CONSTRAINT "advisor_feedback_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "advisor_analytics_event_type_created_at_idx" ON "advisor_analytics_event" USING btree ("event_type","created_at");--> statement-breakpoint
CREATE INDEX "advisor_analytics_event_retention_created_at_idx" ON "advisor_analytics_event" USING btree ("retention","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "advisor_feedback_session_recommendation_unique_idx" ON "advisor_feedback" USING btree ("session_id","recommendation_id");--> statement-breakpoint
CREATE INDEX "advisor_feedback_created_at_idx" ON "advisor_feedback" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "advisor_feedback_sentiment_idx" ON "advisor_feedback" USING btree ("sentiment");