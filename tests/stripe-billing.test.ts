import Stripe from "stripe";
import { describe, expect, it } from "vitest";

import {
  buildCardCheckoutSessionParams,
  buildPromptPaySubscriptionParams,
  verifyStripeWebhook,
} from "@/server/stripe-billing";

describe("Stripe billing adapter", () => {
  it("builds a server-owned card subscription Checkout Session", () => {
    const params = buildCardCheckoutSessionParams({
      sellerId: "seller-1",
      priceId: "price_server",
      baseUrl: "https://tskc.example",
      next: "/setup/website",
      expiresAt: new Date("2026-07-12T12:30:00.000Z"),
    });

    expect(params).toMatchObject({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: "price_server", quantity: 1 }],
      success_url: "https://tskc.example/setup/website",
      cancel_url: "https://tskc.example/billing?checkout=cancelled",
      metadata: {
        sellerId: "seller-1",
        planId: "branded_website_monthly",
        paymentMethod: "card",
      },
      subscription_data: {
        metadata: {
          sellerId: "seller-1",
          planId: "branded_website_monthly",
          paymentMethod: "card",
        },
      },
    });
  });

  it("builds a seven-day PromptPay invoice subscription", () => {
    expect(
      buildPromptPaySubscriptionParams({
        sellerId: "seller-1",
        customerId: "cus_123",
        priceId: "price_server",
      }),
    ).toMatchObject({
      customer: "cus_123",
      collection_method: "send_invoice",
      days_until_due: 7,
      items: [{ price: "price_server", quantity: 1 }],
      payment_settings: { payment_method_types: ["promptpay"] },
      metadata: {
        sellerId: "seller-1",
        planId: "branded_website_monthly",
        paymentMethod: "promptpay",
      },
      expand: ["latest_invoice"],
    });
  });

  it("verifies the exact raw webhook body", async () => {
    const stripe = new Stripe("unit_test_key");
    const secret = "unit_test_webhook_secret";
    const payload = JSON.stringify({
      id: "evt_123",
      object: "event",
      created: 1,
      type: "invoice.paid",
      data: { object: { id: "in_123" } },
    });
    const signature = await stripe.webhooks.generateTestHeaderStringAsync({ payload, secret });

    await expect(verifyStripeWebhook(stripe, payload, signature, secret)).resolves.toMatchObject({
      id: "evt_123",
    });
    await expect(verifyStripeWebhook(stripe, `${payload} `, signature, secret)).rejects.toThrow();
  });
});
