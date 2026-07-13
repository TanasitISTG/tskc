import { describe, expect, it, vi } from "vitest";

import type { shop } from "@/db/schema";
import type { WebsiteAssetRef } from "@/lib/websites";
import {
  WebsiteOwnershipError,
  mergeWebsiteAssets,
  persistSellerWebsite,
  websiteConflictKind,
} from "@/server/websites";

const now = new Date("2026-07-13T10:00:00.000Z");
const baseShop: typeof shop.$inferSelect = {
  id: "shop-a",
  subdomain: "north-star",
  draftContent: { businessName: "North Star" },
  publishedContent: null,
  publishedAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

function fakeDatabase(returning: (values: Record<string, unknown>) => unknown[] = () => []) {
  const inserted: Record<string, unknown>[] = [];
  const updates: Record<string, unknown>[] = [];
  const database = {
    insert: vi.fn(() => ({
      values: vi.fn((values: Record<string, unknown>) => {
        inserted.push(values);
        return { values };
      }),
    })),
    batch: vi.fn(async () => undefined),
    update: vi.fn(() => ({
      set: vi.fn((values: Record<string, unknown>) => {
        updates.push(values);
        return {
          where: vi.fn(() => ({ returning: vi.fn(async () => returning(values)) })),
        };
      }),
    })),
  };

  return { database: database as never, inserted, updates, batch: database.batch };
}

describe("persistSellerWebsite", () => {
  it("atomically creates the shop and one owner membership", async () => {
    const { database, inserted, batch } = fakeDatabase();

    const result = await persistSellerWebsite(database, {
      sellerId: "seller-a",
      shopId: "shop-a",
      existingShop: null,
      subdomain: "north-star",
      draftContent: { tagline: "Made slowly" },
      intent: "save",
      now,
    });

    expect(batch).toHaveBeenCalledOnce();
    expect(inserted).toHaveLength(2);
    expect(inserted[0]).toMatchObject({
      id: "shop-a",
      subdomain: "north-star",
      draftContent: { tagline: "Made slowly" },
      publishedContent: null,
    });
    expect(inserted[1]).toEqual({ shopId: "shop-a", userId: "seller-a", createdAt: now });
    expect(result.publishedContent).toBeNull();
  });

  it("publishes both snapshots, then preserves publication on later draft saves", async () => {
    let stored = baseShop;
    const { database } = fakeDatabase((values) => {
      stored = { ...stored, ...values } as typeof shop.$inferSelect;
      return [stored];
    });

    const published = await persistSellerWebsite(database, {
      sellerId: "seller-a",
      shopId: "shop-a",
      existingShop: stored,
      subdomain: "north-star",
      draftContent: { businessName: "North Star", description: "Published copy" },
      intent: "publish",
      now,
    });
    const publication = published.publishedContent;

    const saved = await persistSellerWebsite(database, {
      sellerId: "seller-a",
      shopId: "shop-a",
      existingShop: published,
      subdomain: "north-star",
      draftContent: { businessName: "Renamed draft" },
      intent: "save",
      now: new Date("2026-07-14T10:00:00.000Z"),
    });

    expect(publication).toEqual({ businessName: "North Star", description: "Published copy" });
    expect(saved.draftContent).toEqual({ businessName: "Renamed draft" });
    expect(saved.publishedContent).toEqual(publication);
    expect(saved.publishedAt).toEqual(now);
  });

  it("fails a stale or cross-owner update", async () => {
    const { database } = fakeDatabase(() => []);

    await expect(
      persistSellerWebsite(database, {
        sellerId: "seller-b",
        shopId: "shop-a",
        existingShop: baseShop,
        subdomain: "north-star",
        draftContent: {},
        intent: "save",
        now,
      }),
    ).rejects.toThrow(WebsiteOwnershipError);
  });
});

describe("website asset and conflict helpers", () => {
  const oldLogo: WebsiteAssetRef = {
    key: "websites/shop-a/logo/old.png",
    contentType: "image/png",
    size: 8,
  };
  const newLogo = { ...oldLogo, key: "websites/shop-a/logo/new.png" };

  it("retains stored assets until replacement or explicit removal", () => {
    expect(mergeWebsiteAssets({}, { logo: oldLogo }, {}, new Set())).toEqual({ logo: oldLogo });
    expect(mergeWebsiteAssets({}, { logo: oldLogo }, { logo: newLogo }, new Set())).toEqual({
      logo: newLogo,
    });
    expect(mergeWebsiteAssets({}, { logo: oldLogo }, {}, new Set(["logo"]))).toEqual({});
  });

  it("classifies duplicate subdomains and concurrent first creation", () => {
    expect(websiteConflictKind({ code: "23505", constraint: "shop_subdomain_unique" })).toBe(
      "subdomain",
    );
    expect(
      websiteConflictKind({ code: "23505", constraint: "shop_membership_user_id_unique" }),
    ).toBe("website");
    expect(
      websiteConflictKind({
        cause: { code: "23505", constraint: "shop_subdomain_unique" },
      }),
    ).toBe("subdomain");
    expect(websiteConflictKind(new Error("database unavailable"))).toBeNull();
  });
});
