CREATE TABLE "seller_subscription" (
	"seller_id" text PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"payment_method" text NOT NULL,
	"status" text NOT NULL,
	"checkout_status" text NOT NULL,
	"checkout_attempt_id" text,
	"checkout_expires_at" timestamp with time zone,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"stripe_checkout_session_id" text,
	"stripe_invoice_id" text,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"grace_until" timestamp with time zone,
	"last_event_id" text,
	"last_event_created_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "seller_subscription_plan_v1" CHECK ("seller_subscription"."plan_id" = 'branded_website_monthly'),
	CONSTRAINT "seller_subscription_status_allowed" CHECK ("seller_subscription"."status" in ('pending', 'active', 'past_due', 'canceled', 'suspended')),
	CONSTRAINT "seller_subscription_payment_method_allowed" CHECK ("seller_subscription"."payment_method" in ('card', 'promptpay')),
	CONSTRAINT "seller_subscription_checkout_status_allowed" CHECK ("seller_subscription"."checkout_status" in ('pending', 'completed', 'abandoned'))
);
--> statement-breakpoint
CREATE TABLE "stripe_billing_event" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"object_id" text NOT NULL,
	"seller_id" text,
	"provider_created_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"processed_at" timestamp with time zone,
	"outcome" text
);
--> statement-breakpoint
ALTER TABLE "seller_subscription" ADD CONSTRAINT "seller_subscription_seller_id_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "seller_subscription_stripe_customer_unique" ON "seller_subscription" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seller_subscription_stripe_subscription_unique" ON "seller_subscription" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seller_subscription_stripe_checkout_unique" ON "seller_subscription" USING btree ("stripe_checkout_session_id");