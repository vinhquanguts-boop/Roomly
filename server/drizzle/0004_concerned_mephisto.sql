CREATE TABLE "ai_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_session_id" text,
	"owner_auth_user_id" text,
	"room_id" uuid,
	"design_id" uuid,
	"operation" varchar(32) NOT NULL,
	"provider" varchar(32) NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"duration_ms" integer NOT NULL,
	"estimated_cost_usd" numeric(10, 4) DEFAULT '0' NOT NULL,
	"outcome" varchar(16) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_owner_auth_user_id_auth_user_id_fk" FOREIGN KEY ("owner_auth_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_design_id_designs_id_fk" FOREIGN KEY ("design_id") REFERENCES "public"."designs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_usage_owner_session_created_idx" ON "ai_usage" USING btree ("owner_session_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_owner_auth_created_idx" ON "ai_usage" USING btree ("owner_auth_user_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_operation_created_idx" ON "ai_usage" USING btree ("operation","created_at");