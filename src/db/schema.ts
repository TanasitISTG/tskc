import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import type { WebsiteDraftContent, WebsitePublishedContent } from "@/lib/websites";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const shop = pgTable(
  "shop",
  {
    id: text("id").primaryKey(),
    subdomain: text("subdomain").notNull(),
    draftContent: jsonb("draft_content").$type<WebsiteDraftContent>().notNull().default({}),
    publishedContent: jsonb("published_content").$type<WebsitePublishedContent>(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    check("shop_subdomain_normalized", sql`subdomain = lower(trim(subdomain))`),
    uniqueIndex("shop_subdomain_unique").on(table.subdomain),
  ],
);

export const shopMembership = pgTable(
  "shop_membership",
  {
    shopId: text("shop_id")
      .primaryKey()
      .references(() => shop.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [uniqueIndex("shop_membership_user_id_unique").on(table.userId)],
);

export const sellerSubscription = pgTable(
  "seller_subscription",
  {
    sellerId: text("seller_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    planId: text("plan_id").notNull(),
    paymentMethod: text("payment_method").notNull(),
    status: text("status").notNull(),
    checkoutStatus: text("checkout_status").notNull(),
    checkoutAttemptId: text("checkout_attempt_id"),
    checkoutExpiresAt: timestamp("checkout_expires_at", { withTimezone: true }),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    stripeInvoiceId: text("stripe_invoice_id"),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    graceUntil: timestamp("grace_until", { withTimezone: true }),
    lastEventId: text("last_event_id"),
    lastEventCreatedAt: timestamp("last_event_created_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    check("seller_subscription_plan_v1", sql`${table.planId} = 'branded_website_monthly'`),
    check(
      "seller_subscription_status_allowed",
      sql`${table.status} in ('pending', 'active', 'past_due', 'canceled', 'suspended')`,
    ),
    check(
      "seller_subscription_payment_method_allowed",
      sql`${table.paymentMethod} in ('card', 'promptpay')`,
    ),
    check(
      "seller_subscription_checkout_status_allowed",
      sql`${table.checkoutStatus} in ('pending', 'completed', 'abandoned')`,
    ),
    uniqueIndex("seller_subscription_stripe_customer_unique").on(table.stripeCustomerId),
    uniqueIndex("seller_subscription_stripe_subscription_unique").on(table.stripeSubscriptionId),
    uniqueIndex("seller_subscription_stripe_checkout_unique").on(table.stripeCheckoutSessionId),
  ],
);

export const stripeBillingEvent = pgTable("stripe_billing_event", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  objectId: text("object_id").notNull(),
  sellerId: text("seller_id"),
  providerCreatedAt: timestamp("provider_created_at", { withTimezone: true }).notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  outcome: text("outcome"),
});

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("account_provider_account_id_unique").on(table.providerId, table.accountId),
  ],
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});
