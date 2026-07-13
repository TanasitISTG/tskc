import "server-only";

import type Stripe from "stripe";

import {
  billingPaymentPaths,
  billingPlan,
  billingReturnPaths,
  stripeBillingEventTypes,
  type StripeBillingEventType,
} from "@/lib/billing";
import type { BillingLifecycleEvent } from "@/server/subscriptions";

type CardCheckoutParams = {
  sellerId: string;
  priceId: string;
  baseUrl: string;
  next: string;
  expiresAt: Date;
  customerId?: string;
};

function billingMetadata(sellerId: string, paymentMethod: "card" | "promptpay") {
  return {
    sellerId,
    planId: billingPlan.id,
    paymentMethod,
  };
}

export function buildCardCheckoutSessionParams({
  sellerId,
  priceId,
  baseUrl,
  next,
  expiresAt,
  customerId,
}: CardCheckoutParams): Stripe.Checkout.SessionCreateParams {
  const metadata = billingMetadata(sellerId, "card");

  return {
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    metadata,
    subscription_data: { metadata },
    success_url: new URL(next, baseUrl).toString(),
    cancel_url: new URL(billingReturnPaths.cancel, baseUrl).toString(),
    expires_at: Math.floor(expiresAt.getTime() / 1000),
    ...(customerId === undefined ? {} : { customer: customerId }),
  };
}

export function buildPromptPaySubscriptionParams({
  sellerId,
  customerId,
  priceId,
}: {
  sellerId: string;
  customerId: string;
  priceId: string;
}): Stripe.SubscriptionCreateParams {
  return {
    customer: customerId,
    collection_method: billingPaymentPaths.promptpay.collectionMethod,
    days_until_due: billingPaymentPaths.promptpay.dueDays,
    items: [{ price: priceId, quantity: 1 }],
    payment_settings: { payment_method_types: ["promptpay"] },
    metadata: billingMetadata(sellerId, "promptpay"),
    expand: ["latest_invoice"],
  };
}

export function verifyStripeWebhook(
  stripe: Stripe,
  rawBody: string,
  signature: string,
  webhookSecret: string,
) {
  return stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
}

export function assertCanonicalStripePrice(price: Stripe.Price, configuredPriceId: string) {
  if (
    price.id !== configuredPriceId ||
    !price.active ||
    price.type !== "recurring" ||
    price.currency !== billingPlan.currency ||
    price.unit_amount !== billingPlan.amountMinor ||
    price.recurring?.interval !== billingPlan.interval ||
    price.recurring.interval_count !== 1
  ) {
    throw new Error("Stripe price does not match the billing contract");
  }
}

export function assertStripeHostedUrl(value: string | null) {
  if (value === null) {
    throw new Error("Stripe did not return a hosted payment URL");
  }

  const url = new URL(value);

  if (url.protocol !== "https:" || !url.hostname.endsWith(".stripe.com")) {
    throw new Error("Stripe returned an invalid hosted payment URL");
  }

  return url.toString();
}

function expandableId(value: { id: string } | string | null | undefined) {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? value : value.id;
}

type StripeBillingObject = Stripe.Checkout.Session | Stripe.Invoice | Stripe.Subscription;

function billingObject(event: Stripe.Event): StripeBillingObject {
  if (event.type === "checkout.session.completed") {
    return event.data.object as Stripe.Checkout.Session;
  }

  if (event.type.startsWith("customer.subscription.")) {
    return event.data.object as Stripe.Subscription;
  }

  return event.data.object as Stripe.Invoice;
}

async function eventSubscription(stripe: Stripe, object: StripeBillingObject) {
  if (object.object === "subscription") {
    return object;
  }

  let reference: Stripe.Subscription | string | null = null;

  if (object.object === "checkout.session") {
    reference = object.subscription;
  } else if (object.object === "invoice") {
    reference = object.parent?.subscription_details?.subscription ?? null;
  }

  if (reference === null) return null;
  if (typeof reference !== "string") return reference;
  return stripe.subscriptions.retrieve(reference, { expand: ["latest_invoice"] });
}

export async function normalizeStripeBillingEvent(
  stripe: Stripe,
  event: Stripe.Event,
): Promise<BillingLifecycleEvent | null> {
  if (!stripeBillingEventTypes.includes(event.type as StripeBillingEventType)) {
    return null;
  }

  const object = billingObject(event);
  const subscription = await eventSubscription(stripe, object);
  const item = subscription?.items.data[0];
  const invoice = object.object === "invoice" ? object : null;
  const session = object.object === "checkout.session" ? object : null;
  const metadata = subscription?.metadata ?? session?.metadata ?? {};

  return {
    id: event.id,
    type: event.type as StripeBillingEventType,
    createdAt: new Date(event.created * 1000),
    objectId: object.id,
    sellerId: metadata.sellerId ?? null,
    planId: metadata.planId ?? null,
    priceId: item?.price.id ?? null,
    stripeCustomerId: expandableId(subscription?.customer ?? session?.customer),
    stripeSubscriptionId: subscription?.id ?? expandableId(session?.subscription),
    stripeCheckoutSessionId: session?.id ?? null,
    stripeInvoiceId: invoice?.id ?? expandableId(subscription?.latest_invoice),
    amountPaid: invoice?.amount_paid ?? null,
    currency: invoice?.currency ?? subscription?.currency ?? null,
    currentPeriodStart: item === undefined ? null : new Date(item.current_period_start * 1000),
    currentPeriodEnd: item === undefined ? null : new Date(item.current_period_end * 1000),
    cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
    providerStatus: subscription?.status ?? null,
  };
}
