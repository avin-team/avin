CREATE TYPE "public"."protection_provider_bond_withdrawal_status" AS ENUM('COOLING', 'PENDING_APPROVAL', 'COMPLETED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "protection_provider_bond_withdrawal" (
	"approval_reason" text,
	"approved_at" timestamp,
	"approved_by_user_id" text,
	"bond_adjustment_id" uuid,
	"completed_at" timestamp,
	"cooling_ends_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"external_action_reference" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"private_evidence_reference" text,
	"profile_id" uuid NOT NULL,
	"provider_user_id" text NOT NULL,
	"recorded_at" timestamp,
	"recorded_by_user_id" text,
	"recognized_amount_at_request" integer NOT NULL,
	"rejection_reason" text,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"requested_reason" text,
	"returned_amount" integer,
	"status" "protection_provider_bond_withdrawal_status" DEFAULT 'COOLING' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "protection_provider_bond_withdrawal_profile_id_unique" UNIQUE("profile_id")
);
--> statement-breakpoint
CREATE TABLE "protection_provider_bond_withdrawal_history" (
	"actor_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reason" text,
	"status" "protection_provider_bond_withdrawal_status" NOT NULL,
	"withdrawal_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "protection_provider_bond_withdrawal" ADD CONSTRAINT "protection_provider_bond_withdrawal_approved_by_user_id_user_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_bond_withdrawal" ADD CONSTRAINT "protection_provider_bond_withdrawal_bond_adjustment_id_protection_provider_bond_adjustment_id_fk" FOREIGN KEY ("bond_adjustment_id") REFERENCES "public"."protection_provider_bond_adjustment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_bond_withdrawal" ADD CONSTRAINT "protection_provider_bond_withdrawal_profile_id_protection_provider_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."protection_provider_profile"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_bond_withdrawal" ADD CONSTRAINT "protection_provider_bond_withdrawal_provider_user_id_user_id_fk" FOREIGN KEY ("provider_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_bond_withdrawal" ADD CONSTRAINT "protection_provider_bond_withdrawal_recorded_by_user_id_user_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_bond_withdrawal_history" ADD CONSTRAINT "protection_provider_bond_withdrawal_history_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_provider_bond_withdrawal_history" ADD CONSTRAINT "protection_provider_bond_withdrawal_history_withdrawal_id_protection_provider_bond_withdrawal_id_fk" FOREIGN KEY ("withdrawal_id") REFERENCES "public"."protection_provider_bond_withdrawal"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "protection_provider_bond_withdrawal_profile_status_idx" ON "protection_provider_bond_withdrawal" USING btree ("profile_id","status","created_at");--> statement-breakpoint
CREATE INDEX "protection_provider_bond_withdrawal_provider_status_idx" ON "protection_provider_bond_withdrawal" USING btree ("provider_user_id","status","created_at");--> statement-breakpoint
CREATE INDEX "protection_provider_bond_withdrawal_history_idx" ON "protection_provider_bond_withdrawal_history" USING btree ("withdrawal_id","created_at");