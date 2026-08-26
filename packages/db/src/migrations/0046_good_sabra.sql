ALTER TYPE "public"."protection_admin_capability" ADD VALUE 'PROTECTION_EXPORTER' BEFORE 'SUPER_ADMIN';--> statement-breakpoint
CREATE TABLE "protection_pilot_configuration" (
	"approval_cap" integer NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by_user_id" text
);
--> statement-breakpoint
CREATE TABLE "protection_pilot_invitation" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invited_by_user_id" text,
	"provider_user_id" text NOT NULL,
	"used_at" timestamp,
	CONSTRAINT "protection_pilot_invitation_provider_user_id_unique" UNIQUE("provider_user_id")
);
--> statement-breakpoint
ALTER TABLE "protection_pilot_configuration" ADD CONSTRAINT "protection_pilot_configuration_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_pilot_invitation" ADD CONSTRAINT "protection_pilot_invitation_invited_by_user_id_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_pilot_invitation" ADD CONSTRAINT "protection_pilot_invitation_provider_user_id_user_id_fk" FOREIGN KEY ("provider_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "protection_pilot_invitation_created_idx" ON "protection_pilot_invitation" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "protection_pilot_invitation_used_idx" ON "protection_pilot_invitation" USING btree ("used_at");--> statement-breakpoint
INSERT INTO "protection_pilot_configuration" ("approval_cap", "enabled", "id")
VALUES (10, true, 'DEFAULT')
ON CONFLICT ("id") DO NOTHING;
