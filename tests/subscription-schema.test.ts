import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { sellerSubscription, stripeBillingEvent } from "@/db/schema";

describe("subscription persistence schema", () => {
  it("enforces one billing record per seller and unique provider identities", () => {
    const config = getTableConfig(sellerSubscription);

    expect(sellerSubscription.sellerId.primary).toBe(true);
    expect(sellerSubscription.planId.notNull).toBe(true);
    expect(sellerSubscription.status.notNull).toBe(true);
    expect(sellerSubscription.checkoutStatus.notNull).toBe(true);
    expect(config.indexes.filter((index) => index.config.unique)).toHaveLength(3);
    expect(config.checks.map((constraint) => constraint.name)).toEqual(
      expect.arrayContaining([
        "seller_subscription_plan_v1",
        "seller_subscription_status_allowed",
        "seller_subscription_payment_method_allowed",
        "seller_subscription_checkout_status_allowed",
      ]),
    );
  });

  it("uses the provider event ID as the idempotency boundary", () => {
    expect(stripeBillingEvent.id.primary).toBe(true);
    expect(stripeBillingEvent.type.notNull).toBe(true);
    expect(stripeBillingEvent.objectId.notNull).toBe(true);
    expect(stripeBillingEvent.providerCreatedAt.notNull).toBe(true);
    expect(stripeBillingEvent.receivedAt.notNull).toBe(true);
    expect(stripeBillingEvent.processedAt.notNull).toBe(false);
  });
});
