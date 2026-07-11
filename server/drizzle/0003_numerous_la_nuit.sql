ALTER TABLE "purchase_outcomes" ADD COLUMN "product_click_id" uuid;--> statement-breakpoint
ALTER TABLE "purchase_outcomes" ADD COLUMN "design_id" uuid;--> statement-breakpoint
ALTER TABLE "purchase_outcomes" ADD COLUMN "owner_session_id" text;--> statement-breakpoint
ALTER TABLE "purchase_outcomes" ADD COLUMN "owner_auth_user_id" text;--> statement-breakpoint
ALTER TABLE "purchase_outcomes" ADD COLUMN "purchased" boolean;--> statement-breakpoint
ALTER TABLE "purchase_outcomes" ADD CONSTRAINT "purchase_outcomes_product_click_id_product_clicks_id_fk" FOREIGN KEY ("product_click_id") REFERENCES "public"."product_clicks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_outcomes" ADD CONSTRAINT "purchase_outcomes_design_id_designs_id_fk" FOREIGN KEY ("design_id") REFERENCES "public"."designs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_outcomes" ADD CONSTRAINT "purchase_outcomes_owner_auth_user_id_auth_user_id_fk" FOREIGN KEY ("owner_auth_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "purchase_outcomes_design_idx" ON "purchase_outcomes" USING btree ("design_id");--> statement-breakpoint
CREATE INDEX "purchase_outcomes_owner_session_idx" ON "purchase_outcomes" USING btree ("owner_session_id");--> statement-breakpoint
CREATE INDEX "purchase_outcomes_owner_auth_user_idx" ON "purchase_outcomes" USING btree ("owner_auth_user_id");--> statement-breakpoint
ALTER TABLE "purchase_outcomes" ADD CONSTRAINT "purchase_outcomes_product_click_id_unique" UNIQUE("product_click_id");