CREATE TYPE "public"."protection_admin_capability" AS ENUM('PROVIDER_REVIEWER', 'RISK_MODERATOR', 'BOND_OPERATOR', 'PROTECTION_MANAGER', 'SUPER_ADMIN');--> statement-breakpoint
CREATE TABLE "protection_admin_assignment" (
	"capability" "protection_admin_capability" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "ip_address" text;--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "purpose" text;--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "session_id" text;--> statement-breakpoint
ALTER TABLE "protection_admin_assignment" ADD CONSTRAINT "protection_admin_assignment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "protection_admin_assignment_user_idx" ON "protection_admin_assignment" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "protection_admin_assignment_user_capability_idx" ON "protection_admin_assignment" USING btree ("user_id","capability");