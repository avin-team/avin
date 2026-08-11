CREATE TABLE "seller_enforcement_appeal_evidence" (
	"appeal_id" uuid NOT NULL,
	"byte_size" integer NOT NULL,
	"content_type" text NOT NULL,
	"description" text NOT NULL,
	"file_name" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_key" text NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"submitted_by_user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "seller_enforcement_appeal_evidence" ADD CONSTRAINT "seller_enforcement_appeal_evidence_appeal_id_seller_enforcement_appeal_id_fk" FOREIGN KEY ("appeal_id") REFERENCES "public"."seller_enforcement_appeal"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_enforcement_appeal_evidence" ADD CONSTRAINT "seller_enforcement_appeal_evidence_submitted_by_user_id_user_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "seller_enforcement_appeal_evidence_storage_idx" ON "seller_enforcement_appeal_evidence" USING btree ("storage_key");--> statement-breakpoint
CREATE UNIQUE INDEX "seller_enforcement_appeal_evidence_appeal_storage_idx" ON "seller_enforcement_appeal_evidence" USING btree ("appeal_id","storage_key");