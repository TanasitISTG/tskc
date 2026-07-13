import { PgDialect } from "drizzle-orm/pg-core/dialect";
import type Stripe from "stripe";
import { describe, expect, it } from "vitest";

import type { BillingLifecycleEvent } from "@/server/subscriptions";
import { processBillingEvent } from "@/server/subscriptions";
import { normalizeStripeBillingEvent } from "@/server/stripe-billing";

const dialect = new PgDialect();

const subscription = {
  id: "sub_123",
  object: "subscription",
  customer: "cus_123",
  status: "active",
  cancel_at_period_end: false,
  metadata: {
    sellerId: "seller-1",
    planId: "branded_website_monthly",
  },
  items: {
    data: [
      {
        price: { id: "price_server" },
        current_period_start: 1_752_278_400,
        current_period_end: 1_754_956_800,
      },
    ],
  },
  latest_invoice: "in_123",
} as unknown as Stripe.Subscription;

const paidEvent = {
  id: "evt_paid",
  object: "event",
  created: 1_752_321_600,
  type: "invoice.paid",
  data: {
    object: {
      id: "in_123",
      object: "invoice",
      amount_paid: 14900,
      currency: "thb",
      parent: {
        subscription_details: { subscription: "sub_123" },
      },
    },
  },
} as unknown as Stripe.Event;

describe("billing webhook normalization", () => {
  it("resolves signed invoice events to server-owned subscription metadata", async () => {
    const stripe = {
      subscriptions: {
        retrieve: async (id: string) => {
          expect(id).toBe("sub_123");
          return subscription;
        },
      },
    } as unknown as Stripe;

    await expect(normalizeStripeBillingEvent(stripe, paidEvent)).resolves.toMatchObject({
      id: "evt_paid",
      type: "invoice.paid",
      objectId: "in_123",
      sellerId: "seller-1",
      planId: "branded_website_monthly",
      priceId: "price_server",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      stripeInvoiceId: "in_123",
      amountPaid: 14900,
      currency: "thb",
      providerStatus: "active",
    });
  });

  it("ignores event types outside the Task 4 allowlist", async () => {
    const stripe = {} as Stripe;
    const event = { ...paidEvent, type: "payment_intent.succeeded" } as Stripe.Event;

    await expect(normalizeStripeBillingEvent(stripe, event)).resolves.toBeNull();
  });
});

describe("billing event persistence", () => {
  it("claims the event ID before applying the subscription transition in one statement", async () => {
    let query = { sql: "", params: [] as unknown[] };
    let call = 0;
    const database = {
      execute: async (statement: unknown) => {
        if (call++ === 0) query = dialect.sqlToQuery(statement as never);
        return { rows: [{ outcome: "applied" }] };
      },
    };
    const event: BillingLifecycleEvent = {
      id: "evt_paid",
      type: "invoice.paid",
      createdAt: new Date("2026-07-12T12:00:00.000Z"),
      objectId: "in_123",
      sellerId: "seller-1",
      planId: "branded_website_monthly",
      priceId: "price_server",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      stripeCheckoutSessionId: null,
      stripeInvoiceId: "in_123",
      amountPaid: 14900,
      currency: "thb",
      currentPeriodStart: new Date("2026-07-12T00:00:00.000Z"),
      currentPeriodEnd: new Date("2026-08-12T00:00:00.000Z"),
      cancelAtPeriodEnd: false,
      providerStatus: "active",
    };

    await expect(
      processBillingEvent(database, event, "price_server", new Date("2026-07-12T12:00:01.000Z")),
    ).resolves.toBe("applied");

    expect(query.sql).toContain('insert into "stripe_billing_event"');
    expect(query.sql).toContain("on conflict");
    expect(query.sql).toContain('update "seller_subscription"');
    expect(query.sql.indexOf('insert into "stripe_billing_event"')).toBeLessThan(
      query.sql.indexOf('update "seller_subscription"'),
    );
    expect(query.sql).toContain("exists (select 1 from claimed)");
    expect(query.params).toContain("evt_paid");
  });

  it("persists but does not apply non-canonical signed events", async () => {
    let sql = "";
    let call = 0;
    const database = {
      execute: async (statement: unknown) => {
        if (call++ === 0) sql = dialect.sqlToQuery(statement as never).sql;
        return { rows: [{ outcome: "ignored_invalid" }] };
      },
    };
    const invalid = {
      id: "evt_invalid",
      type: "invoice.paid",
      createdAt: new Date("2026-07-12T12:00:00.000Z"),
      objectId: "in_bad",
      sellerId: "seller-1",
      planId: "client_plan",
      priceId: "price_server",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      stripeCheckoutSessionId: null,
      stripeInvoiceId: "in_bad",
      amountPaid: 14900,
      currency: "thb",
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      providerStatus: "active",
    } satisfies BillingLifecycleEvent;

    await expect(
      processBillingEvent(database, invalid, "price_server", new Date("2026-07-12T12:00:01.000Z")),
    ).resolves.toBe("ignored_invalid");
    expect(sql).toContain('insert into "stripe_billing_event"');
    expect(sql).not.toContain('update "seller_subscription"');
  });

  it("treats an already-claimed event as a harmless duplicate", async () => {
    const database = {
      execute: async () => ({ rows: [] }),
    };
    const duplicate = {
      id: "evt_duplicate",
      type: "invoice.paid",
      createdAt: new Date("2026-07-12T12:00:00.000Z"),
      objectId: "in_123",
      sellerId: "seller-1",
      planId: "branded_website_monthly",
      priceId: "price_server",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      stripeCheckoutSessionId: null,
      stripeInvoiceId: "in_123",
      amountPaid: 14900,
      currency: "thb",
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      providerStatus: "active",
    } satisfies BillingLifecycleEvent;

    await expect(
      processBillingEvent(database, duplicate, "price_server", new Date()),
    ).resolves.toBe("duplicate");
  });
});
