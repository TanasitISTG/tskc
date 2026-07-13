import { PgDialect } from "drizzle-orm/pg-core/dialect";
import { drizzle } from "drizzle-orm/pg-proxy";
import { describe, expect, it } from "vitest";

import * as schema from "@/db/schema";
import {
  findOwnedShop,
  findSellerShop,
  ownedMembershipWhere,
  ownedShopWhere,
  updateOwnedShopSubdomain,
} from "@/server/shops";

const dialect = new PgDialect();

describe("shop ownership query conditions", () => {
  it("scopes owned-shop reads to the requested shop and seller", () => {
    const query = dialect.sqlToQuery(ownedMembershipWhere("shop-a", "seller-a"));

    expect(query.params).toEqual(["shop-a", "seller-a"]);
    expect(query.sql).toContain('"shop_membership"."shop_id"');
    expect(query.sql).toContain('"shop_membership"."user_id"');
  });

  it("scopes shop changes to the requested shop and seller", () => {
    const query = dialect.sqlToQuery(ownedShopWhere("shop-a", "seller-b"));

    expect(query.params).toEqual(["shop-a", "seller-b"]);
    expect(query.sql).toContain('"shop"."id"');
    expect(query.sql).toContain("exists");
    expect(query.sql).toContain('"shop_membership"."user_id"');
  });
});

describe("shop ownership query helpers", () => {
  const database = drizzle(
    async (_sql, params) => {
      const shopId = params.find((value) => value === "shop-a" || value === "shop-b");
      const userId = params.find((value) => value === "seller-a" || value === "seller-b");
      const ownsShop =
        (shopId === "shop-a" && userId === "seller-a") ||
        (shopId === "shop-b" && userId === "seller-b") ||
        (shopId === undefined && userId === "seller-a");

      return {
        rows: ownsShop
          ? [
              [
                shopId ?? "shop-a",
                "alpha",
                {},
                null,
                null,
                new Date("2026-01-01"),
                new Date("2026-01-01"),
              ],
            ]
          : [],
      };
    },
    { schema },
  );

  it("does not return a shop to a different seller", async () => {
    await expect(findOwnedShop(database, "shop-a", "seller-b")).resolves.toBe(null);
  });

  it("does not update a shop for a different seller", async () => {
    await expect(updateOwnedShopSubdomain(database, "shop-a", "seller-b", "renamed")).resolves.toBe(
      null,
    );
  });

  it("looks up the seller website through owner membership", async () => {
    await expect(findSellerShop(database, "seller-a")).resolves.toMatchObject({ id: "shop-a" });
    await expect(findSellerShop(database, "seller-b")).resolves.toBeNull();
  });
});
