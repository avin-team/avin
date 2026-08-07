CREATE TYPE "public"."withdrawal_request_status" AS ENUM('REQUESTED', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED');--> statement-breakpoint
ALTER TYPE "public"."ledger_account_type" ADD VALUE 'SELLER_WALLET_HELD' BEFORE 'ESCROW';--> statement-breakpoint
ALTER TYPE "public"."ledger_transaction_type" ADD VALUE 'SELLER_WALLET_MIGRATION';--> statement-breakpoint
CREATE TABLE "withdrawal_request" (
	"amount" integer NOT NULL,
	"approved_at" timestamp,
	"approved_by_user_id" text,
	"bank_account" jsonb NOT NULL,
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" text NOT NULL,
	"paid_at" timestamp,
	"paid_by_user_id" text,
	"paid_transaction_id" uuid,
	"payment_reference" text,
	"rejected_at" timestamp,
	"rejected_by_user_id" text,
	"rejection_reason" text,
	"request_transaction_id" uuid NOT NULL,
	"reversal_transaction_id" uuid,
	"seller_id" text NOT NULL,
	"status" "withdrawal_request_status" DEFAULT 'REQUESTED' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "withdrawal_request_amount_minimum_check" CHECK ("withdrawal_request"."amount" >= 5000)
);
--> statement-breakpoint
ALTER TABLE "withdrawal_request" ADD CONSTRAINT "withdrawal_request_approved_by_user_id_user_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal_request" ADD CONSTRAINT "withdrawal_request_paid_by_user_id_user_id_fk" FOREIGN KEY ("paid_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal_request" ADD CONSTRAINT "withdrawal_request_paid_transaction_id_ledger_transaction_id_fk" FOREIGN KEY ("paid_transaction_id") REFERENCES "public"."ledger_transaction"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal_request" ADD CONSTRAINT "withdrawal_request_rejected_by_user_id_user_id_fk" FOREIGN KEY ("rejected_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal_request" ADD CONSTRAINT "withdrawal_request_request_transaction_id_ledger_transaction_id_fk" FOREIGN KEY ("request_transaction_id") REFERENCES "public"."ledger_transaction"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal_request" ADD CONSTRAINT "withdrawal_request_reversal_transaction_id_ledger_transaction_id_fk" FOREIGN KEY ("reversal_transaction_id") REFERENCES "public"."ledger_transaction"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal_request" ADD CONSTRAINT "withdrawal_request_seller_id_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "withdrawal_request_seller_idempotency_unique_idx" ON "withdrawal_request" USING btree ("seller_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "withdrawal_request_request_transaction_unique_idx" ON "withdrawal_request" USING btree ("request_transaction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "withdrawal_request_paid_transaction_unique_idx" ON "withdrawal_request" USING btree ("paid_transaction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "withdrawal_request_reversal_transaction_unique_idx" ON "withdrawal_request" USING btree ("reversal_transaction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "withdrawal_request_payment_reference_unique_idx" ON "withdrawal_request" USING btree ("payment_reference");--> statement-breakpoint
CREATE INDEX "withdrawal_request_seller_created_at_idx" ON "withdrawal_request" USING btree ("seller_id","created_at");--> statement-breakpoint
CREATE INDEX "withdrawal_request_status_created_at_idx" ON "withdrawal_request" USING btree ("status","created_at");
