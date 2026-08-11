CREATE TYPE "public"."seller_enforcement_action_type" AS ENUM('SUSPEND', 'BAN', 'LIFT', 'ESCALATE', 'OVERTURN', 'EXPIRE', 'REASON_CORRECTED');--> statement-breakpoint
CREATE TYPE "public"."seller_enforcement_appeal_status" AS ENUM('SUBMITTED', 'UNDER_REVIEW', 'UPHELD', 'OVERTURNED', 'SUPERSEDED');--> statement-breakpoint
CREATE TYPE "public"."seller_enforcement_reason_code" AS ENUM('FRAUD_RISK', 'POLICY_VIOLATION', 'FULFILLMENT_RISK', 'FINANCIAL_RISK', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."seller_enforcement_remediation_item_status" AS ENUM('PENDING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."seller_enforcement_remediation_status" AS ENUM('PENDING', 'RUNNING', 'COMPLETED', 'NEEDS_ATTENTION');--> statement-breakpoint
CREATE TYPE "public"."seller_enforcement_state" AS ENUM('CLEAR', 'SUSPENDED', 'BANNED');--> statement-breakpoint
CREATE TABLE "seller_enforcement" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"seller_id" text PRIMARY KEY NOT NULL,
	"state" "seller_enforcement_state" DEFAULT 'CLEAR' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seller_enforcement_action" (
	"action_type" "seller_enforcement_action_type" NOT NULL,
	"actor_user_id" text,
	"admin_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"effective_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" text NOT NULL,
	"new_state" "seller_enforcement_state" NOT NULL,
	"previous_state" "seller_enforcement_state" NOT NULL,
	"reason_code" "seller_enforcement_reason_code" NOT NULL,
	"seller_id" text NOT NULL,
	"seller_reason" text NOT NULL,
	"supersedes_action_id" uuid
);
--> statement-breakpoint
CREATE TABLE "seller_enforcement_appeal" (
	"action_id" uuid NOT NULL,
	"admin_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" text NOT NULL,
	"outcome_reason" text,
	"reviewed_at" timestamp,
	"reviewer_user_id" text,
	"seller_id" text NOT NULL,
	"seller_reason" text NOT NULL,
	"status" "seller_enforcement_appeal_status" DEFAULT 'SUBMITTED' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "seller_enforcement_appeal_action_id_unique" UNIQUE("action_id")
);
--> statement-breakpoint
CREATE TABLE "seller_enforcement_remediation" (
	"action_id" uuid NOT NULL,
	"completed_items" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"failed_items" integer DEFAULT 0 NOT NULL,
	"finished_at" timestamp,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"last_error" text,
	"seller_id" text NOT NULL,
	"started_at" timestamp,
	"status" "seller_enforcement_remediation_status" DEFAULT 'PENDING' NOT NULL,
	"total_items" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "seller_enforcement_remediation_action_id_unique" UNIQUE("action_id")
);
--> statement-breakpoint
CREATE TABLE "seller_enforcement_remediation_item" (
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"last_error" text,
	"order_item_id" uuid NOT NULL,
	"processed_at" timestamp,
	"remediation_id" uuid NOT NULL,
	"status" "seller_enforcement_remediation_item_status" DEFAULT 'PENDING' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "seller_enforcement" ADD CONSTRAINT "seller_enforcement_seller_id_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_enforcement_action" ADD CONSTRAINT "seller_enforcement_action_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_enforcement_action" ADD CONSTRAINT "seller_enforcement_action_seller_id_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_enforcement_appeal" ADD CONSTRAINT "seller_enforcement_appeal_action_id_seller_enforcement_action_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."seller_enforcement_action"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_enforcement_appeal" ADD CONSTRAINT "seller_enforcement_appeal_reviewer_user_id_user_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_enforcement_appeal" ADD CONSTRAINT "seller_enforcement_appeal_seller_id_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_enforcement_remediation" ADD CONSTRAINT "seller_enforcement_remediation_action_id_seller_enforcement_action_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."seller_enforcement_action"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_enforcement_remediation" ADD CONSTRAINT "seller_enforcement_remediation_seller_id_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_enforcement_remediation_item" ADD CONSTRAINT "seller_enforcement_remediation_item_order_item_id_order_item_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_item"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_enforcement_remediation_item" ADD CONSTRAINT "seller_enforcement_remediation_item_remediation_id_seller_enforcement_remediation_id_fk" FOREIGN KEY ("remediation_id") REFERENCES "public"."seller_enforcement_remediation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "seller_enforcement_action_seller_key_idx" ON "seller_enforcement_action" USING btree ("seller_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "seller_enforcement_action_supersedes_idx" ON "seller_enforcement_action" USING btree ("supersedes_action_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seller_enforcement_appeal_action_idx" ON "seller_enforcement_appeal" USING btree ("action_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seller_enforcement_appeal_seller_key_idx" ON "seller_enforcement_appeal" USING btree ("seller_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "seller_enforcement_remediation_action_idx" ON "seller_enforcement_remediation" USING btree ("action_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seller_enforcement_remediation_seller_action_idx" ON "seller_enforcement_remediation" USING btree ("seller_id","action_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seller_enforcement_remediation_item_unique_idx" ON "seller_enforcement_remediation_item" USING btree ("remediation_id","order_item_id");