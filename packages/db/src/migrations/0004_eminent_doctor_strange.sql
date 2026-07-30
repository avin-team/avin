CREATE TYPE "public"."seller_application_status" AS ENUM('PENDING_REVIEW', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "seller_application" (
	"applicant_name" text NOT NULL,
	"bank_account" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"review_reason" text,
	"revision_count" integer DEFAULT 0 NOT NULL,
	"seller_agreement_accepted_at" timestamp DEFAULT now() NOT NULL,
	"seller_agreement_version" text NOT NULL,
	"seller_profile_id" uuid NOT NULL,
	"status" "seller_application_status" DEFAULT 'PENDING_REVIEW' NOT NULL,
	"storefront_name" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seller_profile" (
	"avatar_url" text,
	"bank_account" jsonb,
	"bio" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text,
	"phone_verified" boolean DEFAULT false NOT NULL,
	"storefront_name" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "seller_profile_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "seller_application" ADD CONSTRAINT "seller_application_seller_profile_id_seller_profile_id_fk" FOREIGN KEY ("seller_profile_id") REFERENCES "public"."seller_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_application" ADD CONSTRAINT "seller_application_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_profile" ADD CONSTRAINT "seller_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "seller_application_user_id_idx" ON "seller_application" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "seller_application_profile_id_idx" ON "seller_application" USING btree ("seller_profile_id");--> statement-breakpoint
CREATE INDEX "seller_application_status_idx" ON "seller_application" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "seller_profile_user_id_idx" ON "seller_profile" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "seller_profile_phone_idx" ON "seller_profile" USING btree ("phone");