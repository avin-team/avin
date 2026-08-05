CREATE TYPE "public"."order_message_sender_role" AS ENUM('buyer', 'seller', 'admin');--> statement-breakpoint
CREATE TYPE "public"."order_message_type" AS ENUM('text', 'system', 'admin_mediation');--> statement-breakpoint
CREATE TABLE "chat_read_cursor" (
	"last_read_message_id" uuid,
	"order_id" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "chat_read_cursor_order_id_user_id_pk" PRIMARY KEY("order_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "order_message" (
	"content" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"redacted_at" timestamp,
	"redacted_by_user_id" text,
	"sender_id" text NOT NULL,
	"sender_role" "order_message_sender_role" NOT NULL,
	"type" "order_message_type" DEFAULT 'text' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_file" ADD COLUMN "order_message_id" uuid;--> statement-breakpoint
ALTER TABLE "chat_read_cursor" ADD CONSTRAINT "chat_read_cursor_last_read_message_id_order_message_id_fk" FOREIGN KEY ("last_read_message_id") REFERENCES "public"."order_message"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_read_cursor" ADD CONSTRAINT "chat_read_cursor_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_read_cursor" ADD CONSTRAINT "chat_read_cursor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_message" ADD CONSTRAINT "order_message_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_message" ADD CONSTRAINT "order_message_redacted_by_user_id_user_id_fk" FOREIGN KEY ("redacted_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_message" ADD CONSTRAINT "order_message_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_read_cursor_order_user_idx" ON "chat_read_cursor" USING btree ("order_id","user_id");--> statement-breakpoint
CREATE INDEX "order_message_order_idx" ON "order_message" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_message_order_created_idx" ON "order_message" USING btree ("order_id","created_at");--> statement-breakpoint
ALTER TABLE "order_file" ADD CONSTRAINT "order_file_order_message_id_order_message_id_fk" FOREIGN KEY ("order_message_id") REFERENCES "public"."order_message"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_file_order_message_idx" ON "order_file" USING btree ("order_message_id");