import { z } from "zod";

import { safeReturnTo } from "@/lib/auth-guards";

export const billingPlan = {
  id: "branded_website_monthly",
  amountMinor: 14900,
  currency: "thb",
  interval: "month",
} as const;

export const billingReturnPaths = {
  success: "/billing?checkout=success",
  cancel: "/billing?checkout=cancelled",
} as const;

export const billingPolicy = {
  abandonedCheckoutGrantsAccess: false,
  cancelAtPeriodEnd: true,
  gracePeriodDays: 3,
  maxPendingCheckoutsPerSeller: 1,
  managementAccessDuringGrace: true,
  publicSiteAvailableDuringGrace: true,
} as const;

export const billingPaymentPaths = {
  card: {
    collectionMethod: "charge_automatically",
    flow: "checkout_subscription",
  },
  promptpay: {
    collectionMethod: "send_invoice",
    dueDays: 7,
    flow: "subscription_invoice",
  },
} as const;

export type BillingPaymentMethod = keyof typeof billingPaymentPaths;

export const billingCheckoutStatuses = ["pending", "completed", "abandoned"] as const;
export type BillingCheckoutStatus = (typeof billingCheckoutStatuses)[number];

export const billingSubscriptionStatuses = [
  "pending",
  "active",
  "past_due",
  "canceled",
  "suspended",
] as const;
export type BillingSubscriptionStatus = (typeof billingSubscriptionStatuses)[number];

const billingPaymentMethodSchema = z.enum(["card", "promptpay"]);

export const billingCheckoutInputSchema = z
  .object({
    paymentMethod: billingPaymentMethodSchema,
    next: z.string().optional().default(billingReturnPaths.success),
  })
  .strict()
  .transform((input) => ({
    ...input,
    next: safeReturnTo(input.next),
  }));

export type BillingCheckoutInput = z.infer<typeof billingCheckoutInputSchema>;

export const stripeBillingEventTypes = [
  "checkout.session.completed",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
  "invoice.overdue",
  "invoice.finalization_failed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
] as const;
export type StripeBillingEventType = (typeof stripeBillingEventTypes)[number];

export type BillingEventEffect =
  | "activate"
  | "cancel"
  | "past_due"
  | "reconcile"
  | "record_only"
  | "sync";

export const billingEventEffects: Record<StripeBillingEventType, BillingEventEffect> = {
  "checkout.session.completed": "record_only",
  "invoice.paid": "activate",
  "invoice.payment_failed": "past_due",
  "invoice.payment_action_required": "past_due",
  "invoice.overdue": "past_due",
  "invoice.finalization_failed": "reconcile",
  "customer.subscription.updated": "sync",
  "customer.subscription.deleted": "cancel",
};

export const verifiedBillingEventSchema = z
  .object({
    id: z.string().trim().min(1),
    type: z.enum(stripeBillingEventTypes),
    created: z.number().int().nonnegative(),
    objectId: z.string().trim().min(1),
  })
  .strict();

export type VerifiedBillingEvent = z.infer<typeof verifiedBillingEventSchema>;
