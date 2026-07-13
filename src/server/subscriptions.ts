import "server-only";

import { sql, type SQL } from "drizzle-orm";

import {
  billingPlan,
  billingPolicy,
  type BillingCheckoutStatus,
  type BillingSubscriptionStatus,
  type StripeBillingEventType,
} from "@/lib/billing";

const DAY_MS = 24 * 60 * 60 * 1000;

export type SubscriptionState = {
  status: BillingSubscriptionStatus;
  checkoutStatus: BillingCheckoutStatus;
  graceUntil: Date | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  lastEventId: string | null;
  lastEventCreatedAt: Date | null;
};

export type BillingLifecycleEvent = {
  id: string;
  type: StripeBillingEventType;
  createdAt: Date;
  objectId: string;
  sellerId: string | null;
  planId: string | null;
  priceId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeCheckoutSessionId: string | null;
  stripeInvoiceId: string | null;
  amountPaid: number | null;
  currency: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  providerStatus: string | null;
};

export type SubscriptionTransitionOutcome =
  | "applied"
  | "ignored_invalid"
  | "ignored_stale"
  | "recorded";

export type SubscriptionTransition = {
  outcome: SubscriptionTransitionOutcome;
  state: SubscriptionState;
};

function isCanonicalEvent(event: BillingLifecycleEvent, configuredPriceId: string) {
  return event.planId === billingPlan.id && event.priceId === configuredPriceId;
}

function withEvent(
  state: SubscriptionState,
  event: BillingLifecycleEvent,
  patch: Partial<SubscriptionState>,
): SubscriptionState {
  return {
    ...state,
    ...patch,
    lastEventId: event.id,
    lastEventCreatedAt: event.createdAt,
  };
}

export function decideSubscriptionTransition(
  state: SubscriptionState,
  event: BillingLifecycleEvent,
  configuredPriceId: string,
  now: Date,
): SubscriptionTransition {
  if (!isCanonicalEvent(event, configuredPriceId)) {
    return { outcome: "ignored_invalid", state };
  }

  const staleByCreatedAt =
    state.lastEventCreatedAt !== null && event.createdAt < state.lastEventCreatedAt;

  if (event.type === "checkout.session.completed") {
    return {
      outcome: "recorded",
      state: withEvent(state, event, { checkoutStatus: "completed" }),
    };
  }

  if (event.type === "invoice.paid") {
    if (event.amountPaid !== billingPlan.amountMinor || event.currency !== billingPlan.currency) {
      return { outcome: "ignored_invalid", state };
    }

    const olderBillingPeriod =
      event.currentPeriodEnd === null ||
      (state.currentPeriodEnd !== null && event.currentPeriodEnd < state.currentPeriodEnd);
    if (staleByCreatedAt && olderBillingPeriod) {
      return { outcome: "ignored_stale", state };
    }

    return {
      outcome: "applied",
      state: withEvent(state, event, {
        status: "active",
        checkoutStatus: "completed",
        graceUntil: null,
        currentPeriodStart: event.currentPeriodStart,
        currentPeriodEnd: event.currentPeriodEnd,
        cancelAtPeriodEnd: event.cancelAtPeriodEnd,
      }),
    };
  }

  if (staleByCreatedAt) {
    return { outcome: "ignored_stale", state };
  }

  if (
    event.type === "invoice.payment_failed" ||
    event.type === "invoice.payment_action_required" ||
    event.type === "invoice.overdue"
  ) {
    const graceUntil = new Date(event.createdAt.getTime() + billingPolicy.gracePeriodDays * DAY_MS);

    return {
      outcome: "applied",
      state: withEvent(state, event, {
        status: graceUntil <= now ? "suspended" : "past_due",
        graceUntil,
      }),
    };
  }

  if (event.type === "customer.subscription.deleted") {
    return {
      outcome: "applied",
      state: withEvent(state, event, {
        status: "canceled",
        cancelAtPeriodEnd: false,
        graceUntil: null,
      }),
    };
  }

  if (event.type === "customer.subscription.updated") {
    if (event.providerStatus === "past_due" || event.providerStatus === "unpaid") {
      const graceUntil = new Date(
        event.createdAt.getTime() + billingPolicy.gracePeriodDays * DAY_MS,
      );
      return {
        outcome: "applied",
        state: withEvent(state, event, {
          status: graceUntil <= now ? "suspended" : "past_due",
          graceUntil,
          cancelAtPeriodEnd: event.cancelAtPeriodEnd,
          currentPeriodStart: event.currentPeriodStart,
          currentPeriodEnd: event.currentPeriodEnd,
        }),
      };
    }

    return {
      outcome: "applied",
      state: withEvent(state, event, {
        cancelAtPeriodEnd: event.cancelAtPeriodEnd,
        currentPeriodStart: event.currentPeriodStart,
        currentPeriodEnd: event.currentPeriodEnd,
      }),
    };
  }

  return { outcome: "recorded", state: withEvent(state, event, {}) };
}

export function getSubscriptionAccess(state: SubscriptionState, now: Date) {
  if (state.status === "active") {
    return { allowed: true, effectiveStatus: "active" as const };
  }

  if (state.status === "past_due" && state.graceUntil !== null && state.graceUntil > now) {
    return { allowed: true, effectiveStatus: "past_due" as const };
  }

  return {
    allowed: false,
    effectiveStatus:
      state.status === "past_due" && state.graceUntil !== null && state.graceUntil <= now
        ? ("suspended" as const)
        : state.status,
  };
}

export class SubscriptionAccessError extends Error {
  readonly code = "SUBSCRIPTION_REQUIRED";
  readonly planHref = "/billing";

  constructor() {
    super("An active subscription is required");
    this.name = "SubscriptionAccessError";
  }
}

export function requireSubscriptionAccess(state: SubscriptionState, now: Date) {
  const access = getSubscriptionAccess(state, now);

  if (!access.allowed) {
    throw new SubscriptionAccessError();
  }

  return access;
}

type BillingEventDatabase = {
  execute: (statement: SQL) => Promise<{ rows: Array<{ outcome: string }> }>;
};

function isCanonicalForProcessing(event: BillingLifecycleEvent, configuredPriceId: string) {
  if (
    event.sellerId === null ||
    event.planId !== billingPlan.id ||
    event.priceId !== configuredPriceId
  ) {
    return false;
  }

  return (
    event.type !== "invoice.paid" ||
    (event.amountPaid === billingPlan.amountMinor && event.currency === billingPlan.currency)
  );
}

function eventIdentityMatches(event: BillingLifecycleEvent) {
  const subscriptionMatches =
    event.stripeSubscriptionId === null
      ? sql`true`
      : sql`("stripe_subscription_id" is null or "stripe_subscription_id" = ${event.stripeSubscriptionId})`;

  return sql`
    "seller_id" = ${event.sellerId}
    and "plan_id" = ${billingPlan.id}
    and ${subscriptionMatches}
    and exists (select 1 from claimed)
  `;
}

function eventUpdate(event: BillingLifecycleEvent, now: Date): SQL {
  const identity = eventIdentityMatches(event);

  if (event.type === "checkout.session.completed") {
    return sql`
      update "seller_subscription"
      set
        "checkout_status" = 'completed',
        "stripe_customer_id" = coalesce(${event.stripeCustomerId}, "stripe_customer_id"),
        "stripe_subscription_id" = coalesce(${event.stripeSubscriptionId}, "stripe_subscription_id"),
        "stripe_checkout_session_id" = coalesce(${event.stripeCheckoutSessionId}, "stripe_checkout_session_id"),
        "updated_at" = ${now}
      where ${identity}
      returning "seller_id"
    `;
  }

  if (event.type === "invoice.paid") {
    const paidPeriodIsCurrent =
      event.currentPeriodEnd === null
        ? sql`false`
        : sql`("current_period_end" is null or "current_period_end" <= ${event.currentPeriodEnd})`;

    return sql`
      update "seller_subscription"
      set
        "status" = 'active',
        "checkout_status" = 'completed',
        "stripe_customer_id" = coalesce(${event.stripeCustomerId}, "stripe_customer_id"),
        "stripe_subscription_id" = coalesce(${event.stripeSubscriptionId}, "stripe_subscription_id"),
        "stripe_invoice_id" = coalesce(${event.stripeInvoiceId}, "stripe_invoice_id"),
        "current_period_start" = coalesce(${event.currentPeriodStart}, "current_period_start"),
        "current_period_end" = coalesce(${event.currentPeriodEnd}, "current_period_end"),
        "cancel_at_period_end" = ${event.cancelAtPeriodEnd},
        "grace_until" = null,
        "last_event_id" = ${event.id},
        "last_event_created_at" = ${event.createdAt},
        "updated_at" = ${now}
      where ${identity}
        and "status" <> 'canceled'
        and (
          "last_event_created_at" is null
          or "last_event_created_at" <= ${event.createdAt}
          or ${paidPeriodIsCurrent}
        )
      returning "seller_id"
    `;
  }

  if (
    event.type === "invoice.payment_failed" ||
    event.type === "invoice.payment_action_required" ||
    event.type === "invoice.overdue"
  ) {
    const graceUntil = new Date(event.createdAt.getTime() + billingPolicy.gracePeriodDays * DAY_MS);
    const status = graceUntil <= now ? "suspended" : "past_due";

    return sql`
      update "seller_subscription"
      set
        "status" = ${status},
        "stripe_invoice_id" = coalesce(${event.stripeInvoiceId}, "stripe_invoice_id"),
        "grace_until" = ${graceUntil},
        "last_event_id" = ${event.id},
        "last_event_created_at" = ${event.createdAt},
        "updated_at" = ${now}
      where ${identity}
        and "status" <> 'canceled'
        and ("last_event_created_at" is null or "last_event_created_at" < ${event.createdAt})
      returning "seller_id"
    `;
  }

  if (event.type === "customer.subscription.deleted") {
    return sql`
      update "seller_subscription"
      set
        "status" = 'canceled',
        "cancel_at_period_end" = false,
        "grace_until" = null,
        "last_event_id" = ${event.id},
        "last_event_created_at" = ${event.createdAt},
        "updated_at" = ${now}
      where ${identity}
        and ("last_event_created_at" is null or "last_event_created_at" <= ${event.createdAt})
      returning "seller_id"
    `;
  }

  if (event.type === "customer.subscription.updated") {
    const graceUntil = new Date(event.createdAt.getTime() + billingPolicy.gracePeriodDays * DAY_MS);
    const providerStatus = event.providerStatus;
    const nextStatus =
      providerStatus === "canceled"
        ? "canceled"
        : providerStatus === "past_due" || providerStatus === "unpaid"
          ? graceUntil <= now
            ? "suspended"
            : "past_due"
          : null;

    return sql`
      update "seller_subscription"
      set
        "status" = coalesce(${nextStatus}, "status"),
        "current_period_start" = coalesce(${event.currentPeriodStart}, "current_period_start"),
        "current_period_end" = coalesce(${event.currentPeriodEnd}, "current_period_end"),
        "cancel_at_period_end" = ${event.cancelAtPeriodEnd},
        "grace_until" = case when ${nextStatus} = 'past_due' then ${graceUntil} else "grace_until" end,
        "last_event_id" = ${event.id},
        "last_event_created_at" = ${event.createdAt},
        "updated_at" = ${now}
      where ${identity}
        and "status" <> 'canceled'
        and ("last_event_created_at" is null or "last_event_created_at" <= ${event.createdAt})
      returning "seller_id"
    `;
  }

  return sql`
    select "seller_id"
    from "seller_subscription"
    where ${identity}
  `;
}

function processingStatement(event: BillingLifecycleEvent, configuredPriceId: string, now: Date) {
  const canonical = isCanonicalForProcessing(event, configuredPriceId);
  const change = canonical ? eventUpdate(event, now) : sql`select null where false`;
  const successOutcome = event.type === "checkout.session.completed" ? "recorded" : "applied";

  return sql`
    with claimed as (
      insert into "stripe_billing_event" (
        "id", "type", "object_id", "seller_id", "provider_created_at", "received_at"
      ) values (
        ${event.id}, ${event.type}, ${event.objectId}, ${event.sellerId}, ${event.createdAt}, ${now}
      )
      on conflict ("id") do nothing
      returning "id"
    ), changed as (
      ${change}
    )
    select case
        when ${canonical} = false then 'ignored_invalid'
        when exists (select 1 from changed) then ${successOutcome}
        else 'ignored_stale_or_missing'
      end as "outcome"
    from claimed
  `;
}

export async function processBillingEvent(
  database: BillingEventDatabase,
  event: BillingLifecycleEvent,
  configuredPriceId: string,
  now = new Date(),
) {
  const result = await database.execute(processingStatement(event, configuredPriceId, now));
  const outcome = result.rows[0]?.outcome ?? "duplicate";

  if (outcome !== "duplicate") {
    await database.execute(sql`
      update "stripe_billing_event"
      set "processed_at" = ${now}, "outcome" = ${outcome}
      where "id" = ${event.id}
      returning "outcome"
    `);
  }

  return outcome;
}
