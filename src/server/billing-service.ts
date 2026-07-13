import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq, inArray, lte, ne, or } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import type { TablesRelationalConfig } from "drizzle-orm/relations";
import Stripe from "stripe";

import { getDatabase } from "@/db/client";
import { sellerSubscription, shopMembership, user } from "@/db/schema";
import {
  billingPaymentPaths,
  billingPlan,
  type BillingCheckoutInput,
  type BillingPaymentMethod,
} from "@/lib/billing";
import { parseServerEnv } from "@/lib/env";
import {
  getSubscriptionAccess,
  requireSubscriptionAccess,
  type SubscriptionState,
} from "@/server/subscriptions";
import {
  assertCanonicalStripePrice,
  assertStripeHostedUrl,
  buildCardCheckoutSessionParams,
  buildPromptPaySubscriptionParams,
} from "@/server/stripe-billing";

const CARD_CHECKOUT_MINUTES = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

type Database = ReturnType<typeof getDatabase>;
type SubscriptionRow = typeof sellerSubscription.$inferSelect;

export type BillingServiceErrorCode =
  | "ALREADY_ACTIVE"
  | "CHECKOUT_AWAITING_PAYMENT"
  | "CHECKOUT_UNAVAILABLE"
  | "PROVIDER_UNAVAILABLE"
  | "SUBSCRIPTION_NOT_FOUND";

export class BillingServiceError extends Error {
  constructor(readonly code: BillingServiceErrorCode) {
    super(code);
    this.name = "BillingServiceError";
  }
}

export function ownedSubscriptionWhere(sellerId: string) {
  return eq(sellerSubscription.sellerId, sellerId);
}

function stateFromRow(row: SubscriptionRow): SubscriptionState {
  return {
    status: row.status as SubscriptionState["status"],
    checkoutStatus: row.checkoutStatus as SubscriptionState["checkoutStatus"],
    graceUntil: row.graceUntil,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    currentPeriodStart: row.currentPeriodStart,
    currentPeriodEnd: row.currentPeriodEnd,
    lastEventId: row.lastEventId,
    lastEventCreatedAt: row.lastEventCreatedAt,
  };
}

async function findSubscription(database: Database, sellerId: string) {
  const [row] = await database
    .select()
    .from(sellerSubscription)
    .where(ownedSubscriptionWhere(sellerId))
    .limit(1);
  return row ?? null;
}

async function suspendExpiredGrace(database: Database, row: SubscriptionRow, now: Date) {
  const access = getSubscriptionAccess(stateFromRow(row), now);

  if (row.status !== "past_due" || access.effectiveStatus !== "suspended") {
    return row;
  }

  const [updated] = await database
    .update(sellerSubscription)
    .set({ status: "suspended", updatedAt: now })
    .where(
      and(
        ownedSubscriptionWhere(row.sellerId),
        eq(sellerSubscription.status, "past_due"),
        lte(sellerSubscription.graceUntil, now),
      ),
    )
    .returning();

  return updated ?? { ...row, status: "suspended", updatedAt: now };
}

export async function getSellerBillingStatus(
  sellerId: string,
  now = new Date(),
  database = getDatabase(),
) {
  const found = await findSubscription(database, sellerId);

  if (found === null) {
    return null;
  }

  const row = await suspendExpiredGrace(database, found, now);
  const access = getSubscriptionAccess(stateFromRow(row), now);

  return {
    plan: billingPlan,
    paymentMethod: row.paymentMethod as BillingPaymentMethod,
    status: access.effectiveStatus,
    checkoutStatus: row.checkoutStatus as SubscriptionState["checkoutStatus"],
    accessAllowed: access.allowed,
    graceUntil: row.graceUntil,
    currentPeriodEnd: row.currentPeriodEnd,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
  };
}

export async function requireSellerSubscriptionAccess(
  sellerId: string,
  now = new Date(),
  database = getDatabase(),
) {
  const found = await findSubscription(database, sellerId);

  if (found === null) {
    return requireSubscriptionAccess(
      {
        status: "pending",
        checkoutStatus: "abandoned",
        graceUntil: null,
        cancelAtPeriodEnd: false,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        lastEventId: null,
        lastEventCreatedAt: null,
      },
      now,
    );
  }

  const row = await suspendExpiredGrace(database, found, now);
  return requireSubscriptionAccess(stateFromRow(row), now);
}

export async function hasShopSubscriptionAccess<
  TQueryResult extends PgQueryResultHKT,
  TFullSchema extends Record<string, unknown>,
  TSchema extends TablesRelationalConfig,
>(shopId: string, now = new Date(), database: PgDatabase<TQueryResult, TFullSchema, TSchema>) {
  const [result] = await database
    .select({
      sellerId: shopMembership.userId,
      status: sellerSubscription.status,
      checkoutStatus: sellerSubscription.checkoutStatus,
      graceUntil: sellerSubscription.graceUntil,
      cancelAtPeriodEnd: sellerSubscription.cancelAtPeriodEnd,
      currentPeriodStart: sellerSubscription.currentPeriodStart,
      currentPeriodEnd: sellerSubscription.currentPeriodEnd,
      lastEventId: sellerSubscription.lastEventId,
      lastEventCreatedAt: sellerSubscription.lastEventCreatedAt,
    })
    .from(shopMembership)
    .innerJoin(sellerSubscription, eq(sellerSubscription.sellerId, shopMembership.userId))
    .where(eq(shopMembership.shopId, shopId))
    .limit(1);

  if (result === undefined) return false;
  const state: SubscriptionState = {
    status: result.status as SubscriptionState["status"],
    checkoutStatus: result.checkoutStatus as SubscriptionState["checkoutStatus"],
    graceUntil: result.graceUntil,
    cancelAtPeriodEnd: result.cancelAtPeriodEnd,
    currentPeriodStart: result.currentPeriodStart,
    currentPeriodEnd: result.currentPeriodEnd,
    lastEventId: result.lastEventId,
    lastEventCreatedAt: result.lastEventCreatedAt,
  };
  const access = getSubscriptionAccess(state, now);

  if (result.status === "past_due" && access.effectiveStatus === "suspended") {
    await database
      .update(sellerSubscription)
      .set({ status: "suspended", updatedAt: now })
      .where(
        and(
          ownedSubscriptionWhere(result.sellerId),
          eq(sellerSubscription.status, "past_due"),
          lte(sellerSubscription.graceUntil, now),
        ),
      );
  }

  return access.allowed;
}

function runtime() {
  const env = parseServerEnv(process.env);

  if (env.stripe === undefined) {
    throw new BillingServiceError("PROVIDER_UNAVAILABLE");
  }

  return {
    database: getDatabase(),
    stripe: new Stripe(env.stripe.secretKey),
    priceId: env.stripe.priceId,
    baseUrl: env.betterAuth?.url ?? "http://localhost:3000",
  };
}

async function invoiceFromSubscription(stripe: Stripe, subscription: Stripe.Subscription) {
  if (subscription.latest_invoice === null) return null;
  return typeof subscription.latest_invoice === "string"
    ? stripe.invoices.retrieve(subscription.latest_invoice)
    : subscription.latest_invoice;
}

async function finalizeHostedInvoice(stripe: Stripe, invoice: Stripe.Invoice | null) {
  if (invoice?.status !== "draft") return invoice;
  return stripe.invoices.finalizeInvoice(invoice.id);
}

async function pendingPaymentUrl(stripe: Stripe, row: SubscriptionRow) {
  if (row.stripeCheckoutSessionId !== null) {
    const session = await stripe.checkout.sessions.retrieve(row.stripeCheckoutSessionId);
    if (session.status === "open" && session.url !== null)
      return assertStripeHostedUrl(session.url);
  }

  if (row.stripeInvoiceId !== null) {
    const invoice = await stripe.invoices.retrieve(row.stripeInvoiceId);
    if (invoice.status === "open" && typeof invoice.hosted_invoice_url === "string") {
      return assertStripeHostedUrl(invoice.hosted_invoice_url);
    }
  }

  return null;
}

async function recoveryPaymentUrl(stripe: Stripe, row: SubscriptionRow) {
  if (row.stripeSubscriptionId === null) return null;
  const subscription = await stripe.subscriptions.retrieve(row.stripeSubscriptionId, {
    expand: ["latest_invoice"],
  });
  const invoice = await finalizeHostedInvoice(
    stripe,
    await invoiceFromSubscription(stripe, subscription),
  );
  return invoice === null || typeof invoice.hosted_invoice_url !== "string"
    ? null
    : assertStripeHostedUrl(invoice.hosted_invoice_url);
}

function checkoutExpiry(paymentMethod: BillingPaymentMethod, now: Date) {
  const milliseconds =
    paymentMethod === "card"
      ? CARD_CHECKOUT_MINUTES * 60 * 1000
      : billingPaymentPaths.promptpay.dueDays * DAY_MS;
  return new Date(now.getTime() + milliseconds);
}

async function claimCheckout(
  database: Database,
  sellerId: string,
  paymentMethod: BillingPaymentMethod,
  now: Date,
) {
  const attemptId = randomUUID();
  const expiresAt = checkoutExpiry(paymentMethod, now);
  const [claimed] = await database
    .insert(sellerSubscription)
    .values({
      sellerId,
      planId: billingPlan.id,
      paymentMethod,
      status: "pending",
      checkoutStatus: "pending",
      checkoutAttemptId: attemptId,
      checkoutExpiresAt: expiresAt,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: sellerSubscription.sellerId,
      set: {
        paymentMethod,
        status: "pending",
        checkoutStatus: "pending",
        checkoutAttemptId: attemptId,
        checkoutExpiresAt: expiresAt,
        stripeSubscriptionId: null,
        stripeCheckoutSessionId: null,
        stripeInvoiceId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        graceUntil: null,
        updatedAt: now,
      },
      setWhere: and(
        inArray(sellerSubscription.status, ["pending", "canceled"]),
        or(
          ne(sellerSubscription.checkoutStatus, "pending"),
          lte(sellerSubscription.checkoutExpiresAt, now),
        ),
      ),
    })
    .returning();

  return claimed ?? null;
}

async function sellerIdentity(database: Database, sellerId: string) {
  const [seller] = await database
    .select({ email: user.email, name: user.name })
    .from(user)
    .where(eq(user.id, sellerId))
    .limit(1);

  if (seller === undefined) throw new BillingServiceError("CHECKOUT_UNAVAILABLE");
  return seller;
}

async function createCardCheckout(
  stripe: Stripe,
  database: Database,
  row: SubscriptionRow,
  baseUrl: string,
  priceId: string,
  next: string,
) {
  const session = await stripe.checkout.sessions.create(
    buildCardCheckoutSessionParams({
      sellerId: row.sellerId,
      priceId,
      baseUrl,
      next,
      expiresAt: row.checkoutExpiresAt!,
      ...(row.stripeCustomerId === null ? {} : { customerId: row.stripeCustomerId }),
    }),
    { idempotencyKey: `billing-card-${row.sellerId}-${row.checkoutAttemptId}` },
  );

  const url = assertStripeHostedUrl(session.url);
  await database
    .update(sellerSubscription)
    .set({
      stripeCheckoutSessionId: session.id,
      checkoutExpiresAt: new Date(session.expires_at * 1000),
      updatedAt: new Date(),
    })
    .where(
      and(
        ownedSubscriptionWhere(row.sellerId),
        eq(sellerSubscription.checkoutAttemptId, row.checkoutAttemptId!),
      ),
    );
  return url;
}

async function createPromptPayCheckout(
  stripe: Stripe,
  database: Database,
  row: SubscriptionRow,
  priceId: string,
) {
  const seller = await sellerIdentity(database, row.sellerId);
  const customerId =
    row.stripeCustomerId ??
    (
      await stripe.customers.create(
        {
          email: seller.email,
          name: seller.name,
          metadata: { sellerId: row.sellerId, planId: billingPlan.id },
        },
        { idempotencyKey: `billing-customer-${row.sellerId}` },
      )
    ).id;
  const subscription = await stripe.subscriptions.create(
    buildPromptPaySubscriptionParams({ sellerId: row.sellerId, customerId, priceId }),
    { idempotencyKey: `billing-promptpay-${row.sellerId}-${row.checkoutAttemptId}` },
  );
  const invoice = await finalizeHostedInvoice(
    stripe,
    await invoiceFromSubscription(stripe, subscription),
  );
  const url = assertStripeHostedUrl(invoice?.hosted_invoice_url ?? null);
  const item = subscription.items.data[0];

  await database
    .update(sellerSubscription)
    .set({
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripeInvoiceId: invoice?.id ?? null,
      checkoutExpiresAt:
        invoice?.due_date === null || invoice?.due_date === undefined
          ? row.checkoutExpiresAt
          : new Date(invoice.due_date * 1000),
      currentPeriodStart: item === undefined ? null : new Date(item.current_period_start * 1000),
      currentPeriodEnd: item === undefined ? null : new Date(item.current_period_end * 1000),
      updatedAt: new Date(),
    })
    .where(
      and(
        ownedSubscriptionWhere(row.sellerId),
        eq(sellerSubscription.checkoutAttemptId, row.checkoutAttemptId!),
      ),
    );
  return url;
}

export async function startSellerCheckout(sellerId: string, input: BillingCheckoutInput) {
  const { database, stripe, priceId, baseUrl } = runtime();
  const now = new Date();
  const price = await stripe.prices.retrieve(priceId);
  assertCanonicalStripePrice(price, priceId);

  let existing = await findSubscription(database, sellerId);

  if (existing?.status === "active") {
    throw new BillingServiceError("ALREADY_ACTIVE");
  }

  if (existing?.status === "past_due" || existing?.status === "suspended") {
    const recoveryUrl = await recoveryPaymentUrl(stripe, existing);
    if (recoveryUrl === null) throw new BillingServiceError("CHECKOUT_UNAVAILABLE");
    return { url: recoveryUrl, reused: true };
  }

  if (existing?.status === "pending" && existing.checkoutStatus === "completed") {
    throw new BillingServiceError("CHECKOUT_AWAITING_PAYMENT");
  }

  const pendingIsCurrent =
    existing?.checkoutStatus === "pending" &&
    existing.checkoutExpiresAt !== null &&
    existing.checkoutExpiresAt > now;

  if (existing !== null && pendingIsCurrent) {
    const url = await pendingPaymentUrl(stripe, existing);
    if (url !== null) return { url, reused: true };
  } else {
    const previousSubscriptionId =
      existing?.status === "pending" ? existing.stripeSubscriptionId : null;
    const claimed = await claimCheckout(database, sellerId, input.paymentMethod, now);

    if (claimed === null) {
      existing = await findSubscription(database, sellerId);
      if (existing === null) throw new BillingServiceError("CHECKOUT_UNAVAILABLE");
    } else {
      existing = claimed;
      if (previousSubscriptionId !== null) {
        await stripe.subscriptions.cancel(previousSubscriptionId);
      }
    }
  }

  if (existing.checkoutAttemptId === null || existing.checkoutExpiresAt === null) {
    throw new BillingServiceError("CHECKOUT_UNAVAILABLE");
  }

  const paymentMethod = existing.paymentMethod as BillingPaymentMethod;
  const url =
    paymentMethod === "card"
      ? await createCardCheckout(stripe, database, existing, baseUrl, priceId, input.next)
      : await createPromptPayCheckout(stripe, database, existing, priceId);

  return { url, reused: pendingIsCurrent };
}

export async function scheduleSellerCancellation(sellerId: string) {
  const { database, stripe } = runtime();
  const row = await findSubscription(database, sellerId);

  if (row?.stripeSubscriptionId === null || row?.stripeSubscriptionId === undefined) {
    throw new BillingServiceError("SUBSCRIPTION_NOT_FOUND");
  }

  const subscription = await stripe.subscriptions.update(row.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });
  await database
    .update(sellerSubscription)
    .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
    .where(
      and(
        ownedSubscriptionWhere(sellerId),
        eq(sellerSubscription.stripeSubscriptionId, row.stripeSubscriptionId),
      ),
    );

  return { cancelAtPeriodEnd: subscription.cancel_at_period_end };
}

export function isBillingProviderAvailable() {
  return parseServerEnv(process.env).stripe !== undefined;
}
