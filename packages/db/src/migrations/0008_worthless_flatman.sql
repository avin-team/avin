CREATE TYPE "public"."deposit_request_status" AS ENUM('PENDING', 'CREDITED');--> statement-breakpoint
CREATE TYPE "public"."ledger_account_type" AS ENUM('PLATFORM_BANK_CLEARING', 'USER_WALLET_AVAILABLE', 'USER_WALLET_HELD', 'SELLER_WALLET_PENDING', 'SELLER_WALLET_AVAILABLE', 'ESCROW', 'PLATFORM_COMMISSION');--> statement-breakpoint
CREATE TYPE "public"."ledger_balance_side" AS ENUM('DEBIT', 'CREDIT');--> statement-breakpoint
CREATE TYPE "public"."ledger_transaction_type" AS ENUM('DEPOSIT', 'PURCHASE_HOLD', 'ESCROW_RELEASE', 'PLATFORM_COMMISSION', 'REFUND', 'WITHDRAWAL_REQUEST', 'WITHDRAWAL_PAID', 'REVERSAL');--> statement-breakpoint
CREATE TYPE "public"."sepay_event_source" AS ENUM('WEBHOOK', 'API');--> statement-breakpoint
CREATE TYPE "public"."sepay_event_status" AS ENUM('RECEIVED', 'UNMATCHED', 'CREDITED', 'RECONCILED');--> statement-breakpoint
CREATE TYPE "public"."sepay_transfer_type" AS ENUM('in', 'out');--> statement-breakpoint
CREATE TYPE "public"."wallet_outbox_event_type" AS ENUM('DEPOSIT_CREDITED');--> statement-breakpoint
CREATE TABLE "deposit_request" (
	"amount" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"credited_at" timestamp,
	"credited_transaction_id" uuid,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_code" text NOT NULL,
	"status" "deposit_request_status" DEFAULT 'PENDING' NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "deposit_request_amount_minimum_check" CHECK ("deposit_request"."amount" >= 5000)
);
--> statement-breakpoint
CREATE TABLE "ledger_account" (
	"account_key" text NOT NULL,
	"account_type" "ledger_account_type" NOT NULL,
	"balance_side" "ledger_balance_side" NOT NULL,
	"balance_amount" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text,
	CONSTRAINT "ledger_account_balance_non_negative_check" CHECK ("ledger_account"."balance_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "ledger_posting" (
	"balance_after" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"credit_amount" integer DEFAULT 0 NOT NULL,
	"debit_amount" integer DEFAULT 0 NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ledger_account_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	CONSTRAINT "ledger_posting_amounts_non_negative_check" CHECK ("ledger_posting"."debit_amount" >= 0 AND "ledger_posting"."credit_amount" >= 0),
	CONSTRAINT "ledger_posting_one_side_check" CHECK (("ledger_posting"."debit_amount" > 0 AND "ledger_posting"."credit_amount" = 0) OR ("ledger_posting"."credit_amount" > 0 AND "ledger_posting"."debit_amount" = 0)),
	CONSTRAINT "ledger_posting_balance_non_negative_check" CHECK ("ledger_posting"."balance_after" >= 0)
);
--> statement-breakpoint
CREATE TABLE "ledger_transaction" (
	"amount" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"currency" text DEFAULT 'VND' NOT NULL,
	"description" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"reversal_of_id" uuid,
	"type" "ledger_transaction_type" NOT NULL,
	CONSTRAINT "ledger_transaction_amount_positive_check" CHECK ("ledger_transaction"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "sepay_payment_event" (
	"account_number" text NOT NULL,
	"amount" integer NOT NULL,
	"bank_reference" text,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"currency" text NOT NULL,
	"deposit_request_id" uuid,
	"failure_reason" text,
	"gateway" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ledger_transaction_id" uuid,
	"payment_code" text,
	"processed_at" timestamp,
	"provider_event_id" text NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"reconciled_by_user_id" text,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"source" "sepay_event_source" NOT NULL,
	"status" "sepay_event_status" DEFAULT 'RECEIVED' NOT NULL,
	"transaction_at" timestamp NOT NULL,
	"transfer_type" "sepay_transfer_type" NOT NULL,
	CONSTRAINT "sepay_payment_event_amount_non_negative_check" CHECK ("sepay_payment_event"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "user_wallet" (
	"available_balance" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"held_balance" integer DEFAULT 0 NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "user_wallet_balances_non_negative_check" CHECK ("user_wallet"."available_balance" >= 0 AND "user_wallet"."held_balance" >= 0)
);
--> statement-breakpoint
CREATE TABLE "wallet_outbox_event" (
	"aggregate_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"event_type" "wallet_outbox_event_type" NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ledger_transaction_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"published_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "deposit_request" ADD CONSTRAINT "deposit_request_credited_transaction_id_ledger_transaction_id_fk" FOREIGN KEY ("credited_transaction_id") REFERENCES "public"."ledger_transaction"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposit_request" ADD CONSTRAINT "deposit_request_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_account" ADD CONSTRAINT "ledger_account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_posting" ADD CONSTRAINT "ledger_posting_ledger_account_id_ledger_account_id_fk" FOREIGN KEY ("ledger_account_id") REFERENCES "public"."ledger_account"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_posting" ADD CONSTRAINT "ledger_posting_transaction_id_ledger_transaction_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."ledger_transaction"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sepay_payment_event" ADD CONSTRAINT "sepay_payment_event_deposit_request_id_deposit_request_id_fk" FOREIGN KEY ("deposit_request_id") REFERENCES "public"."deposit_request"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sepay_payment_event" ADD CONSTRAINT "sepay_payment_event_ledger_transaction_id_ledger_transaction_id_fk" FOREIGN KEY ("ledger_transaction_id") REFERENCES "public"."ledger_transaction"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sepay_payment_event" ADD CONSTRAINT "sepay_payment_event_reconciled_by_user_id_user_id_fk" FOREIGN KEY ("reconciled_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_wallet" ADD CONSTRAINT "user_wallet_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_outbox_event" ADD CONSTRAINT "wallet_outbox_event_ledger_transaction_id_ledger_transaction_id_fk" FOREIGN KEY ("ledger_transaction_id") REFERENCES "public"."ledger_transaction"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "deposit_request_payment_code_unique_idx" ON "deposit_request" USING btree ("payment_code");--> statement-breakpoint
CREATE INDEX "deposit_request_user_created_at_idx" ON "deposit_request" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "deposit_request_status_idx" ON "deposit_request" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_account_key_unique_idx" ON "ledger_account" USING btree ("account_key");--> statement-breakpoint
CREATE INDEX "ledger_account_user_id_idx" ON "ledger_account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ledger_account_type_idx" ON "ledger_account" USING btree ("account_type");--> statement-breakpoint
CREATE INDEX "ledger_posting_account_id_idx" ON "ledger_posting" USING btree ("ledger_account_id");--> statement-breakpoint
CREATE INDEX "ledger_posting_transaction_id_idx" ON "ledger_posting" USING btree ("transaction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_transaction_reference_unique_idx" ON "ledger_transaction" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "ledger_transaction_created_at_idx" ON "ledger_transaction" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ledger_transaction_type_idx" ON "ledger_transaction" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "sepay_payment_event_source_provider_unique_idx" ON "sepay_payment_event" USING btree ("source","provider_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sepay_payment_event_bank_reference_unique_idx" ON "sepay_payment_event" USING btree ("bank_reference");--> statement-breakpoint
CREATE INDEX "sepay_payment_event_status_idx" ON "sepay_payment_event" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sepay_payment_event_payment_code_idx" ON "sepay_payment_event" USING btree ("payment_code");--> statement-breakpoint
CREATE INDEX "sepay_payment_event_transaction_at_idx" ON "sepay_payment_event" USING btree ("transaction_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_wallet_user_id_unique_idx" ON "user_wallet" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_outbox_transaction_unique_idx" ON "wallet_outbox_event" USING btree ("ledger_transaction_id");--> statement-breakpoint
CREATE INDEX "wallet_outbox_unpublished_idx" ON "wallet_outbox_event" USING btree ("published_at","created_at");