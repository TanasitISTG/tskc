import { PgDialect } from "drizzle-orm/pg-core/dialect";
import type Stripe from "stripe";
import { describe, expect, it } from "vitest";

import { assertCanonicalStripePrice, assertStripeHostedUrl } from "@/server/stripe-billing";
import { ownedSubscriptionWhere } from "@/server/billing-service";

const dialect = new PgDialect();

function price(overrides: Partial<Stripe.Price> = {}) {
  return {
    id: "price_server",
    object: "price",
    active: true,
    currency: "thb",
    type: "recurring",
    unit_amount: 14900,
    recurring: {
      interval: "month",
      interval_count: 1,
      usage_type: "licensed",
    },
    ...overrides,
  } as Stripe.Price;
}

describe("billing service boundaries", () => {
  it("scopes every seller subscription lookup to the authenticated seller", () => {
    const query = dialect.sqlToQuery(ownedSubscriptionWhere("seller-a"));

    expect(query.params).toEqual(["seller-a"]);
    expect(query.sql).toContain('"seller_subscription"."seller_id"');
  });

  it("accepts only the configured canonical recurring price", () => {
    expect(() => assertCanonicalStripePrice(price(), "price_server")).not.toThrow();

    for (const invalid of [
      price({ id: "price_other" }),
      price({ active: false }),
      price({ currency: "usd" }),
      price({ unit_amount: 1 }),
      price({ recurring: null }),
    ]) {
      expect(() => assertCanonicalStripePrice(invalid, "price_server")).toThrowError(
        "Stripe price does not match the billing contract",
      );
    }
  });

  it("redirects only to HTTPS pages hosted by Stripe", () => {
    expect(assertStripeHostedUrl("https://checkout.stripe.com/c/pay/test")).toBe(
      "https://checkout.stripe.com/c/pay/test",
    );
    expect(assertStripeHostedUrl("https://invoice.stripe.com/i/test")).toBe(
      "https://invoice.stripe.com/i/test",
    );
    expect(() => assertStripeHostedUrl("https://stripe.com.attacker.example/pay")).toThrow();
    expect(() => assertStripeHostedUrl("http://checkout.stripe.com/pay")).toThrow();
  });
});
