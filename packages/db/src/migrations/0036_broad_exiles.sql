CREATE TABLE "advisor_handoff" (
	"attachment_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confirmed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"include_summary_in_checkout" boolean DEFAULT false NOT NULL,
	"recommendation_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"summary" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "advisor_handoff" ADD CONSTRAINT "advisor_handoff_recommendation_id_advisor_recommendation_id_fk" FOREIGN KEY ("recommendation_id") REFERENCES "public"."advisor_recommendation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_handoff" ADD CONSTRAINT "advisor_handoff_session_id_advisor_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."advisor_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "advisor_handoff_session_unique_idx" ON "advisor_handoff" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "advisor_handoff_recommendation_idx" ON "advisor_handoff" USING btree ("recommendation_id");