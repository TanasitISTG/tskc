import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  billingCheckoutInputSchema,
  billingCheckoutStatuses,
  billingEventEffects,
  billingPaymentPaths,
  billingPlan,
  billingPolicy,
  billingReturnPaths,
  billingSubscriptionStatuses,
  stripeBillingEventTypes,
  verifiedBillingEventSchema,
} from "@/lib/billing";

const billingPageSource = readFileSync(
  resolve(import.meta.dirname, "../src/app/billing/page.tsx"),
  "utf8",
);
const billingCheckoutRouteSource = readFileSync(
  resolve(import.meta.dirname, "../src/app/api/billing/checkout/route.ts"),
  "utf8",
);

describe("billing plan contract", () => {
  it("defines the single monthly branded-website plan", () => {
    expect(billingPlan).toEqual({
      id: "branded_website_monthly",
      amountMinor: 14900,
      currency: "thb",
      interval: "month",
    });
  });

  it("keeps card and PromptPay on their approved collection paths", () => {
    expect(billingPaymentPaths).toEqual({
      card: {
        collectionMethod: "charge_automatically",
        flow: "checkout_subscription",
      },
      promptpay: {
        collectionMethod: "send_invoice",
        dueDays: 7,
        flow: "subscription_invoice",
      },
    });
  });

  it("defines the selected cancellation, grace, and public access policy", () => {
    expect(billingPolicy).toEqual({
      abandonedCheckoutGrantsAccess: false,
      cancelAtPeriodEnd: true,
      gracePeriodDays: 3,
      maxPendingCheckoutsPerSeller: 1,
      managementAccessDuringGrace: true,
      publicSiteAvailableDuringGrace: true,
    });
  });

  it("normalizes return paths and rejects client-controlled billing authority", () => {
    expect(billingCheckoutInputSchema.parse({ paymentMethod: "card" })).toEqual({
      paymentMethod: "card",
      next: billingReturnPaths.success,
    });
    expect(
      billingCheckoutInputSchema.parse({
        paymentMethod: "promptpay",
        next: "https://attacker.example",
      }),
    ).toEqual({
      paymentMethod: "promptpay",
      next: "/",
    });
    expect(() =>
      billingCheckoutInputSchema.parse({ paymentMethod: "card", amountMinor: 1 }),
    ).toThrow();
    expect(() =>
      billingCheckoutInputSchema.parse({ paymentMethod: "card", sellerId: "seller-1" }),
    ).toThrow();
  });

  it("opens Stripe outside the app history entry", () => {
    expect(billingPageSource).toContain('action="/api/billing/checkout"');
    expect(billingPageSource).toContain('method="post"');
    expect(billingPageSource).toContain('target="_blank"');
    expect(billingPageSource).toContain('rel="noopener"');
    expect(billingPageSource).toContain("opens in a new tab");
  });

  it("keeps native checkout posts same-origin", () => {
    expect(billingCheckoutRouteSource).toContain('request.headers.get("origin")');
    expect(billingCheckoutRouteSource).toContain("new URL(request.url).origin");
    expect(billingCheckoutRouteSource).toContain("status: 403");
  });

  it("confirms period-end cancellation before submitting", () => {
    expect(billingPageSource).toContain("AlertDialogTrigger");
    expect(billingPageSource).toContain("Cancel at period end?");
    expect(billingPageSource).toContain("Keep subscription");
    expect(billingPageSource).toContain("AlertDialogAction");
  });

  it("shows customer-facing plan details without empty dividers", () => {
    expect(billingPageSource).not.toContain("<CardDescription>{billingPlan.id}</CardDescription>");
    expect(billingPageSource).toContain("<CardDescription>Monthly subscription</CardDescription>");
    expect(billingPageSource.match(/<CardHeader className="border-b">/g)).toHaveLength(1);
    expect(billingPageSource).toContain('className="mt-6 space-y-2 border-t');
    expect(billingPageSource).not.toContain('className="mt-6 space-y-2 border-y');
  });
});

describe("billing state contract", () => {
  it("keeps abandoned checkout separate from subscription state", () => {
    expect(billingCheckoutStatuses).toEqual(["pending", "completed", "abandoned"]);
    expect(billingSubscriptionStatuses).toEqual([
      "pending",
      "active",
      "past_due",
      "canceled",
      "suspended",
    ]);
  });

  it("allows activation only from a verified paid invoice event", () => {
    expect(billingEventEffects["invoice.paid"]).toBe("activate");
    expect(billingEventEffects["checkout.session.completed"]).toBe("record_only");
    expect(billingEventEffects["invoice.finalization_failed"]).toBe("reconcile");
    expect(billingEventEffects["invoice.overdue"]).toBe("past_due");
    expect(Object.keys(billingEventEffects)).toEqual(stripeBillingEventTypes);
  });

  it("requires an event ID and known event type for future idempotent processing", () => {
    expect(() =>
      verifiedBillingEventSchema.parse({
        type: "invoice.paid",
        created: 1,
        objectId: "in_123",
      }),
    ).toThrow();
    expect(() =>
      verifiedBillingEventSchema.parse({
        id: "evt_123",
        type: "payment_intent.succeeded",
        created: 1,
        objectId: "pi_123",
      }),
    ).toThrow();
  });
});
