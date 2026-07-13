import { describe, expect, it } from "vitest";

import type { BillingLifecycleEvent, SubscriptionState } from "@/server/subscriptions";
import {
  decideSubscriptionTransition,
  getSubscriptionAccess,
  SubscriptionAccessError,
  requireSubscriptionAccess,
} from "@/server/subscriptions";

const configuredPriceId = "price_canonical";
const now = new Date("2026-07-12T12:00:00.000Z");

const pending: SubscriptionState = {
  status: "pending",
  checkoutStatus: "pending",
  graceUntil: null,
  cancelAtPeriodEnd: false,
  currentPeriodStart: null,
  currentPeriodEnd: null,
  lastEventId: null,
  lastEventCreatedAt: null,
};

function event(
  type: BillingLifecycleEvent["type"],
  overrides: Partial<BillingLifecycleEvent> = {},
): BillingLifecycleEvent {
  return {
    id: `evt_${type}`,
    type,
    createdAt: new Date("2026-07-12T11:59:00.000Z"),
    objectId: "in_123",
    sellerId: "seller-1",
    planId: "branded_website_monthly",
    priceId: configuredPriceId,
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
    ...overrides,
  };
}

describe("subscription lifecycle", () => {
  it("records checkout completion without granting access", () => {
    const result = decideSubscriptionTransition(
      pending,
      event("checkout.session.completed", {
        objectId: "cs_123",
        stripeCheckoutSessionId: "cs_123",
      }),
      configuredPriceId,
      now,
    );

    expect(result.outcome).toBe("recorded");
    expect(result.state.status).toBe("pending");
    expect(result.state.checkoutStatus).toBe("completed");
    expect(getSubscriptionAccess(result.state, now).allowed).toBe(false);
  });

  it("activates only for a canonical paid invoice", () => {
    const paid = decideSubscriptionTransition(
      pending,
      event("invoice.paid"),
      configuredPriceId,
      now,
    );

    expect(paid.outcome).toBe("applied");
    expect(paid.state).toMatchObject({
      status: "active",
      checkoutStatus: "completed",
      graceUntil: null,
      lastEventId: "evt_invoice.paid",
    });
    expect(getSubscriptionAccess(paid.state, now)).toEqual({
      allowed: true,
      effectiveStatus: "active",
    });

    for (const invalid of [
      event("invoice.paid", { amountPaid: 1 }),
      event("invoice.paid", { currency: "usd" }),
      event("invoice.paid", { planId: "client_plan" }),
      event("invoice.paid", { priceId: "price_client" }),
    ]) {
      expect(decideSubscriptionTransition(pending, invalid, configuredPriceId, now)).toMatchObject({
        outcome: "ignored_invalid",
        state: pending,
      });
    }
  });

  it("applies grace, expiry, suspension, and verified payment recovery", () => {
    const active = decideSubscriptionTransition(
      pending,
      event("invoice.paid"),
      configuredPriceId,
      now,
    ).state;
    const failedAt = new Date("2026-07-12T12:00:00.000Z");
    const failed = decideSubscriptionTransition(
      active,
      event("invoice.payment_failed", {
        id: "evt_failed",
        createdAt: failedAt,
        amountPaid: 0,
      }),
      configuredPriceId,
      now,
    ).state;

    expect(failed.status).toBe("past_due");
    expect(failed.graceUntil).toEqual(new Date("2026-07-15T12:00:00.000Z"));
    expect(getSubscriptionAccess(failed, new Date("2026-07-15T11:59:59.000Z"))).toEqual({
      allowed: true,
      effectiveStatus: "past_due",
    });
    expect(getSubscriptionAccess(failed, new Date("2026-07-15T12:00:00.000Z"))).toEqual({
      allowed: false,
      effectiveStatus: "suspended",
    });

    const recovered = decideSubscriptionTransition(
      failed,
      event("invoice.paid", {
        id: "evt_recovered",
        createdAt: new Date("2026-07-15T12:01:00.000Z"),
      }),
      configuredPriceId,
      new Date("2026-07-15T12:01:00.000Z"),
    ).state;
    expect(recovered.status).toBe("active");
    expect(recovered.graceUntil).toBeNull();
  });

  it("accepts a paid invoice delivered after a later same-period subscription update", () => {
    const updated = decideSubscriptionTransition(
      pending,
      event("customer.subscription.updated", {
        id: "evt_updated",
        createdAt: new Date("2026-07-12T12:01:00.000Z"),
        providerStatus: "past_due",
      }),
      configuredPriceId,
      now,
    ).state;
    const paid = decideSubscriptionTransition(
      updated,
      event("invoice.paid", {
        id: "evt_paid_delayed",
        createdAt: new Date("2026-07-12T12:00:00.000Z"),
      }),
      configuredPriceId,
      now,
    );

    expect(paid.state).toMatchObject({
      status: "active",
      checkoutStatus: "completed",
      graceUntil: null,
      lastEventId: "evt_paid_delayed",
    });
  });

  it("treats an overdue send-invoice event as a payment failure", () => {
    const result = decideSubscriptionTransition(
      pending,
      event("invoice.overdue", { amountPaid: 0, createdAt: now }),
      configuredPriceId,
      now,
    );

    expect(result.state.status).toBe("past_due");
    expect(result.state.graceUntil).toEqual(new Date("2026-07-15T12:00:00.000Z"));
  });

  it("ignores delayed state events and treats period-end cancellation as active", () => {
    const active = decideSubscriptionTransition(
      pending,
      event("invoice.paid", { createdAt: new Date("2026-07-12T12:00:00.000Z") }),
      configuredPriceId,
      now,
    ).state;
    const staleFailure = decideSubscriptionTransition(
      active,
      event("invoice.payment_failed", {
        id: "evt_stale",
        createdAt: new Date("2026-07-12T11:00:00.000Z"),
        amountPaid: 0,
      }),
      configuredPriceId,
      now,
    );

    expect(staleFailure).toMatchObject({ outcome: "ignored_stale", state: active });

    const cancelScheduled = decideSubscriptionTransition(
      active,
      event("customer.subscription.updated", {
        id: "evt_cancel_scheduled",
        createdAt: new Date("2026-07-12T12:01:00.000Z"),
        cancelAtPeriodEnd: true,
      }),
      configuredPriceId,
      now,
    ).state;
    expect(cancelScheduled).toMatchObject({ status: "active", cancelAtPeriodEnd: true });
  });

  it("exposes a stable server-side access error", () => {
    expect(() => requireSubscriptionAccess(pending, now)).toThrowError(SubscriptionAccessError);

    try {
      requireSubscriptionAccess(pending, now);
    } catch (error) {
      expect(error).toMatchObject({ code: "SUBSCRIPTION_REQUIRED", planHref: "/billing" });
    }
  });
});
