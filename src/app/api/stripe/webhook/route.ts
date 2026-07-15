import Stripe from "stripe";

import { getDatabase } from "@/db/client";
import { parseServerEnv } from "@/lib/env";
import { logEvent } from "@/server/observability";
import { processBillingEvent } from "@/server/subscriptions";
import { normalizeStripeBillingEvent, verifyStripeWebhook } from "@/server/stripe-billing";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const config = parseServerEnv(process.env).stripe;

  if (config === undefined) {
    logEvent("error", "billing.callback.unavailable", { reason: "missing_configuration" });
    return Response.json({ error: "Billing provider unavailable" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");

  if (signature === null) {
    logEvent("warn", "billing.callback.rejected", { reason: "missing_signature" });
    return Response.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = new Stripe(config.secretKey);
  let event: Stripe.Event;

  try {
    event = await verifyStripeWebhook(stripe, rawBody, signature, config.webhookSecret);
  } catch {
    logEvent("warn", "billing.callback.rejected", { reason: "invalid_signature" });
    return Response.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  try {
    const normalized = await normalizeStripeBillingEvent(stripe, event);

    if (normalized === null) {
      return Response.json({ received: true, outcome: "ignored_event_type" });
    }

    const outcome = await processBillingEvent(
      getDatabase(),
      normalized,
      config.priceId,
      new Date(),
    );

    logEvent("info", "subscription.transition", {
      stripeEventId: event.id,
      stripeEventType: event.type,
      outcome,
    });

    return Response.json({ received: true, outcome });
  } catch (error) {
    logEvent("error", "billing.callback.failed", {
      stripeEventId: event.id,
      stripeEventType: event.type,
      errorName: error instanceof Error ? error.name : "UnknownError",
      error,
    });
    return Response.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
