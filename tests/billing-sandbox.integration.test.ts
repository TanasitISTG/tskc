import { eq, inArray, like } from "drizzle-orm";
import Stripe from "stripe";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getDatabase } from "@/db/client";
import { sellerSubscription, stripeBillingEvent, user } from "@/db/schema";
import { billingCheckoutInputSchema } from "@/lib/billing";
import {
  getSellerBillingStatus,
  scheduleSellerCancellation,
  startSellerCheckout,
} from "@/server/billing-service";
import { processBillingEvent } from "@/server/subscriptions";
import { normalizeStripeBillingEvent, verifyStripeWebhook } from "@/server/stripe-billing";

if (process.env.RUN_STRIPE_SANDBOX === "true")
  describe("Stripe sandbox subscription flow", () => {
    const database = getDatabase();
    const suffix = Date.now().toString(36);
    const cardSellerId = `sandbox-card-${suffix}`;
    const promptPaySellerId = `sandbox-promptpay-${suffix}`;
    const sellerIds = [cardSellerId, promptPaySellerId];
    const eventIds: string[] = [];
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const priceId = process.env.STRIPE_PRICE_ID!;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    async function removeSandboxRows(rows: Array<typeof sellerSubscription.$inferSelect>) {
      for (const row of rows) {
        if (row.stripeCheckoutSessionId !== null) {
          const session = await stripe.checkout.sessions.retrieve(row.stripeCheckoutSessionId);
          if (session.status === "open") await stripe.checkout.sessions.expire(session.id);
        }
        if (row.stripeSubscriptionId !== null) {
          const subscription = await stripe.subscriptions.retrieve(row.stripeSubscriptionId);
          if (subscription.status !== "canceled" && subscription.status !== "incomplete_expired") {
            await stripe.subscriptions.cancel(subscription.id);
          }
        }
        if (row.stripeCustomerId !== null) {
          await stripe.customers.del(row.stripeCustomerId);
        }
      }
    }

    beforeAll(async () => {
      const stale = await database
        .select()
        .from(sellerSubscription)
        .where(like(sellerSubscription.sellerId, "sandbox-%"));
      await removeSandboxRows(stale);
      await database
        .delete(stripeBillingEvent)
        .where(like(stripeBillingEvent.sellerId, "sandbox-%"));
      await database.delete(user).where(like(user.id, "sandbox-%"));
    }, 30_000);

    afterAll(async () => {
      const rows = await database
        .select()
        .from(sellerSubscription)
        .where(inArray(sellerSubscription.sellerId, sellerIds));

      await removeSandboxRows(rows);

      if (eventIds.length > 0) {
        await database.delete(stripeBillingEvent).where(inArray(stripeBillingEvent.id, eventIds));
      }
      await database.delete(user).where(inArray(user.id, sellerIds));
    }, 30_000);

    it("keeps a new card seller pending and reuses one Checkout Session", async () => {
      const timestamp = new Date();
      await database.insert(user).values({
        id: cardSellerId,
        name: "Card Sandbox Seller",
        email: `${cardSellerId}@example.invalid`,
        emailVerified: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      const input = billingCheckoutInputSchema.parse({ paymentMethod: "card" });
      const first = await startSellerCheckout(cardSellerId, input);
      const second = await startSellerCheckout(cardSellerId, input);

      expect(first.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
      expect(second).toEqual({ url: first.url, reused: true });
      await expect(getSellerBillingStatus(cardSellerId)).resolves.toMatchObject({
        status: "pending",
        accessAllowed: false,
      });

      const customer = await stripe.customers.create({
        email: `${cardSellerId}@example.invalid`,
        payment_method: "pm_card_visa",
        invoice_settings: { default_payment_method: "pm_card_visa" },
        metadata: { sellerId: cardSellerId, planId: "branded_website_monthly" },
      });
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: priceId, quantity: 1 }],
        metadata: { sellerId: cardSellerId, planId: "branded_website_monthly" },
        expand: ["latest_invoice"],
      });
      const invoice =
        typeof subscription.latest_invoice === "string"
          ? await stripe.invoices.retrieve(subscription.latest_invoice)
          : subscription.latest_invoice!;
      expect(subscription.collection_method).toBe("charge_automatically");
      expect(invoice.status).toBe("paid");

      const cardEventId = `evt_sandbox_card_paid_${suffix}`;
      eventIds.push(cardEventId);
      const payload = JSON.stringify({
        id: cardEventId,
        object: "event",
        created: Math.floor(Date.now() / 1000),
        type: "invoice.paid",
        data: {
          object: {
            id: invoice.id,
            object: "invoice",
            amount_paid: invoice.amount_paid,
            currency: invoice.currency,
            parent: {
              type: "subscription_details",
              subscription_details: { subscription: subscription.id },
            },
          },
        },
      });
      const signature = await stripe.webhooks.generateTestHeaderStringAsync({
        payload,
        secret: webhookSecret,
      });
      const verified = await verifyStripeWebhook(stripe, payload, signature, webhookSecret);
      const normalized = await normalizeStripeBillingEvent(stripe, verified);
      expect(await processBillingEvent(database, normalized!, priceId)).toBe("applied");
      await expect(getSellerBillingStatus(cardSellerId)).resolves.toMatchObject({
        status: "active",
        accessAllowed: true,
      });
      await expect(scheduleSellerCancellation(cardSellerId)).resolves.toEqual({
        cancelAtPeriodEnd: true,
      });
    }, 30_000);

    it("runs PromptPay invoice verification, replay, grace, suspension, recovery, and cancellation", async () => {
      const timestamp = new Date();
      await database.insert(user).values({
        id: promptPaySellerId,
        name: "PromptPay Sandbox Seller",
        email: `${promptPaySellerId}@example.invalid`,
        emailVerified: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      const checkout = await startSellerCheckout(
        promptPaySellerId,
        billingCheckoutInputSchema.parse({ paymentMethod: "promptpay" }),
      );
      expect(checkout.url).toMatch(/^https:\/\/invoice\.stripe\.com\//);

      const [row] = await database
        .select()
        .from(sellerSubscription)
        .where(eq(sellerSubscription.sellerId, promptPaySellerId));
      expect(row).toBeDefined();
      expect(row!.status).toBe("pending");

      async function signedInvoiceEvent(
        id: string,
        type: "invoice.paid" | "invoice.payment_failed",
        created: number,
        amountPaid: number,
      ) {
        eventIds.push(id);
        const payload = JSON.stringify({
          id,
          object: "event",
          created,
          type,
          data: {
            object: {
              id: row!.stripeInvoiceId,
              object: "invoice",
              amount_paid: amountPaid,
              currency: "thb",
              parent: {
                type: "subscription_details",
                subscription_details: { subscription: row!.stripeSubscriptionId },
              },
            },
          },
        });
        const signature = await stripe.webhooks.generateTestHeaderStringAsync({
          payload,
          secret: webhookSecret,
        });
        const verified = await verifyStripeWebhook(stripe, payload, signature, webhookSecret);
        return (await normalizeStripeBillingEvent(stripe, verified))!;
      }

      const created = Math.floor(Date.now() / 1000);
      const paid = await signedInvoiceEvent(
        `evt_sandbox_paid_${suffix}`,
        "invoice.paid",
        created,
        14900,
      );
      expect(await processBillingEvent(database, paid, priceId)).toBe("applied");
      await expect(processBillingEvent(database, paid, priceId)).resolves.toBe("duplicate");
      await expect(getSellerBillingStatus(promptPaySellerId)).resolves.toMatchObject({
        status: "active",
        accessAllowed: true,
      });

      const failed = await signedInvoiceEvent(
        `evt_sandbox_failed_${suffix}`,
        "invoice.payment_failed",
        created + 60,
        0,
      );
      const afterGrace = new Date((created + 60) * 1000 + 4 * 24 * 60 * 60 * 1000);
      await expect(processBillingEvent(database, failed, priceId, afterGrace)).resolves.toBe(
        "applied",
      );
      await expect(getSellerBillingStatus(promptPaySellerId, afterGrace)).resolves.toMatchObject({
        status: "suspended",
        accessAllowed: false,
      });

      const recovered = await signedInvoiceEvent(
        `evt_sandbox_recovered_${suffix}`,
        "invoice.paid",
        created + 120,
        14900,
      );
      await expect(processBillingEvent(database, recovered, priceId, afterGrace)).resolves.toBe(
        "applied",
      );
      await expect(getSellerBillingStatus(promptPaySellerId, afterGrace)).resolves.toMatchObject({
        status: "active",
        accessAllowed: true,
      });

      expect(await scheduleSellerCancellation(promptPaySellerId)).toEqual({
        cancelAtPeriodEnd: true,
      });
    }, 30_000);
  });
