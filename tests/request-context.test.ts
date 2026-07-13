import { drizzle } from "drizzle-orm/pg-proxy";
import { beforeEach, describe, expect, it } from "vitest";

import * as schema from "@/db/schema";
import { resolveRequestTenant } from "@/server/request-context";

describe("resolveRequestTenant", () => {
  const queries: string[] = [];
  const database = drizzle(
    async (sql, params) => {
      queries.push(sql);

      if (sql.includes('"seller_subscription"')) {
        if (params.includes("shop-a")) {
          return {
            rows: [["seller-a", "active", "completed", null, false, null, null, null, null]],
          };
        }

        if (params.includes("shop-suspended")) {
          return {
            rows: [["seller-b", "suspended", "completed", null, false, null, null, null, null]],
          };
        }
      }

      if (params.includes("my-shop")) {
        return {
          rows: [["shop-a", "my-shop", { businessName: "My shop", description: "Published" }]],
        };
      }

      if (params.includes("suspended-shop")) {
        return {
          rows: [
            [
              "shop-suspended",
              "suspended-shop",
              { businessName: "Suspended", description: "Published" },
            ],
          ],
        };
      }

      if (params.includes("draft-shop")) {
        return { rows: [] };
      }

      return { rows: [] };
    },
    { schema },
  );

  beforeEach(() => queries.splice(0));

  it("returns platform context without touching the database", async () => {
    await expect(
      resolveRequestTenant(
        new Headers({ host: "tskc.example", "x-forwarded-host": "my-shop.tskc.example" }),
        "tskc.example",
        database,
      ),
    ).resolves.toEqual({ kind: "platform" });

    expect(queries).toHaveLength(0);
  });

  it("resolves a known seller host and loads its shop", async () => {
    await expect(
      resolveRequestTenant(new Headers({ host: "my-shop.tskc.example" }), "tskc.example", database),
    ).resolves.toMatchObject({
      kind: "storefront",
      subdomain: "my-shop",
      shop: { id: "shop-a", subdomain: "my-shop" },
    });

    expect(queries).toHaveLength(2);
  });

  it("returns only the immutable published snapshot", async () => {
    const tenant = await resolveRequestTenant(
      new Headers({ host: "my-shop.tskc.example" }),
      "tskc.example",
      database,
    );

    expect(tenant).toMatchObject({
      kind: "storefront",
      shop: {
        publishedContent: { businessName: "My shop", description: "Published" },
      },
    });
    expect(tenant.kind === "storefront" ? tenant.shop : null).not.toHaveProperty("draftContent");
    expect(queries[0]).toContain('"shop"."published_content" is not null');
  });

  it("treats an unpublished website as unknown", async () => {
    await expect(
      resolveRequestTenant(
        new Headers({ host: "draft-shop.tskc.example" }),
        "tskc.example",
        database,
      ),
    ).resolves.toEqual({ kind: "unknown" });
  });

  it("returns a suspended tenant for a shop without subscription access", async () => {
    await expect(
      resolveRequestTenant(
        new Headers({ host: "suspended-shop.tskc.example" }),
        "tskc.example",
        database,
      ),
    ).resolves.toEqual({ kind: "suspended", subdomain: "suspended-shop" });
  });

  it("returns unknown for an unclaimed seller host", async () => {
    await expect(
      resolveRequestTenant(
        new Headers({ host: "unclaimed.tskc.example" }),
        "tskc.example",
        database,
      ),
    ).resolves.toEqual({ kind: "unknown" });
  });

  it("ignores forwarded hosts and rejects malformed hosts", async () => {
    await expect(
      resolveRequestTenant(
        new Headers({ host: "tskc.example", "x-forwarded-host": "my-shop.tskc.example" }),
        "tskc.example",
        database,
      ),
    ).resolves.toEqual({ kind: "platform" });

    await expect(
      resolveRequestTenant(
        new Headers({ host: "my-shop.tskc.example, attacker.example" }),
        "tskc.example",
        database,
      ),
    ).resolves.toEqual({ kind: "unknown" });
  });
});
