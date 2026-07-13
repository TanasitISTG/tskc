import Stripe from "stripe";

import { getDatabase } from "@/db/client";
import { parseServerEnv } from "@/lib/env";
import { processBillingEvent } from "@/server/subscriptions";
import { normalizeStripeBillingEvent, verifyStripeWebhook } from "@/server/stripe-billing";

export const runtime = "nodejs";

function billingLog(
  level: "error" | "info" | "warn",
  event: string,
  fields: Record<string, unknown>,
) {
  console[level]({ event, ...fields });
}

export async function POST(request: Request) {
  const config = parseServerEnv(process.env).stripe;

  if (config === undefined) {
    billingLog("error", "billing.webhook.unavailable", { reason: "missing_configuration" });
    return Response.json({ error: "Billing provider unavailable" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");

  if (signature === null) {
    billingLog("warn", "billing.webhook.rejected", { reason: "missing_signature" });
    return Response.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = new Stripe(config.secretKey);
  let event: Stripe.Event;

  try {
    event = await verifyStripeWebhook(stripe, rawBody, signature, config.webhookSecret);
  } catch {
    billingLog("warn", "billing.webhook.rejected", { reason: "invalid_signature" });
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

    billingLog("info", "billing.webhook.processed", {
      stripeEventId: event.id,
      stripeEventType: event.type,
      outcome,
    });

    return Response.json({ received: true, outcome });
  } catch (error) {
    billingLog("error", "billing.webhook.failed", {
      stripeEventId: event.id,
      stripeEventType: event.type,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
