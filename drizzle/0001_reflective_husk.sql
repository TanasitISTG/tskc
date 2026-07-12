CREATE TABLE "shop" (
	"id" text PRIMARY KEY NOT NULL,
	"subdomain" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "shop_subdomain_normalized" CHECK (subdomain = lower(trim(subdomain)))
);
--> statement-breakpoint
CREATE TABLE "shop_membership" (
	"shop_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shop_membership" ADD CONSTRAINT "shop_membership_shop_id_shop_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shop"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_membership" ADD CONSTRAINT "shop_membership_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "shop_subdomain_unique" ON "shop" USING btree ("subdomain");--> statement-breakpoint
CREATE UNIQUE INDEX "shop_membership_user_id_unique" ON "shop_membership" USING btree ("user_id");