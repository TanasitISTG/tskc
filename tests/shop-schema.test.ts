import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { shop, shopMembership } from "@/db/schema";

describe("shop tenancy schema", () => {
  it("stores a normalized unique subdomain", () => {
    const config = getTableConfig(shop);

    expect(config.name).toBe("shop");
    expect(shop.subdomain.notNull).toBe(true);
    expect(config.checks.map((check) => check.name)).toContain("shop_subdomain_normalized");
    expect(config.indexes.some((index) => index.config.unique)).toBe(true);
  });

  it("enforces one owner membership per shop and per seller", () => {
    const config = getTableConfig(shopMembership);

    expect(shopMembership.shopId.primary).toBe(true);
    expect(shopMembership.userId.notNull).toBe(true);
    expect(config.indexes.some((index) => index.config.unique)).toBe(true);
  });
});
