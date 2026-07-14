import "server-only";

import { and, eq } from "drizzle-orm";
import { shop, shopMembership } from "@/db/schema";
import type { WebsiteAssetKind } from "@/server/r2";
import { getDatabase } from "@/db/client";
import type { WebsiteAssetRef, WebsiteDraftContent, WebsitePublishedContent } from "@/lib/websites";
import { websiteDraftContentSchema, websitePublishedContentSchema } from "@/lib/websites";
import { ownedShopWhere } from "@/server/shops";

type WebsiteDatabase = ReturnType<typeof getDatabase>;
export type WebsiteIntent = "save" | "publish";

type PersistWebsiteInput = {
  sellerId: string;
  shopId: string;
  existingShop: typeof shop.$inferSelect | null;
  subdomain: string;
  draftContent: WebsiteDraftContent;
  intent: WebsiteIntent;
  now: Date;
  expectedUpdatedAt?: Date;
};

export class WebsiteOwnershipError extends Error {
  constructor() {
    super("The website is not owned by this seller");
    this.name = "WebsiteOwnershipError";
  }
}

export class WebsiteConflictError extends Error {
  constructor() {
    super("This website changed in another session. Reload and try again.");
    this.name = "WebsiteConflictError";
  }
}

export function mergeWebsiteAssets(
  content: WebsiteDraftContent,
  previous: WebsiteDraftContent,
  uploaded: Partial<Record<WebsiteAssetKind, WebsiteAssetRef>>,
  removals: ReadonlySet<WebsiteAssetKind>,
) {
  const result = { ...content };

  for (const kind of ["logo", "hero"] as const) {
    if (removals.has(kind)) {
      delete result[kind];
    } else if (uploaded[kind] !== undefined) {
      result[kind] = uploaded[kind];
    } else if (previous[kind] !== undefined) {
      result[kind] = previous[kind];
    }
  }

  return websiteDraftContentSchema.parse(result);
}

export function websiteConflictKind(error: unknown): "subdomain" | "website" | null {
  let current = error;

  for (let depth = 0; depth < 4; depth += 1) {
    if (typeof current !== "object" || current === null) {
      return null;
    }

    if ("code" in current && current.code === "23505") {
      const constraint = "constraint" in current ? current.constraint : undefined;
      return constraint === "shop_subdomain_unique" ? "subdomain" : "website";
    }

    current = "cause" in current ? current.cause : undefined;
  }

  return null;
}

export async function persistSellerWebsite(
  database: WebsiteDatabase,
  input: PersistWebsiteInput,
): Promise<typeof shop.$inferSelect> {
  const draftContent = websiteDraftContentSchema.parse(input.draftContent);
  const publishedContent: WebsitePublishedContent | null =
    input.intent === "publish"
      ? websitePublishedContentSchema.parse(draftContent)
      : (input.existingShop?.publishedContent ?? null);
  const publishedAt =
    input.intent === "publish" ? input.now : (input.existingShop?.publishedAt ?? null);

  if (input.existingShop === null) {
    const created = {
      id: input.shopId,
      subdomain: input.subdomain,
      draftContent,
      publishedContent,
      publishedAt,
      createdAt: input.now,
      updatedAt: input.now,
    } satisfies typeof shop.$inferSelect;

    await database.batch([
      database.insert(shop).values(created),
      database.insert(shopMembership).values({
        shopId: input.shopId,
        userId: input.sellerId,
        createdAt: input.now,
      }),
    ]);

    return created;
  }

  const values = {
    subdomain: input.subdomain,
    draftContent,
    updatedAt: input.now,
    ...(input.intent === "publish" ? { publishedContent, publishedAt } : {}),
  };
  const [updated] = await database
    .update(shop)
    .set(values)
    .where(
      input.expectedUpdatedAt === undefined
        ? ownedShopWhere(input.existingShop.id, input.sellerId)
        : and(
            ownedShopWhere(input.existingShop.id, input.sellerId),
            eq(shop.updatedAt, input.expectedUpdatedAt),
          ),
    )
    .returning();

  if (updated === undefined) {
    throw input.expectedUpdatedAt === undefined
      ? new WebsiteOwnershipError()
      : new WebsiteConflictError();
  }

  return updated;
}

export async function unpublishSellerWebsite(
  database: WebsiteDatabase,
  input: {
    sellerId: string;
    shopId: string;
    expectedUpdatedAt?: Date;
    now: Date;
  },
): Promise<typeof shop.$inferSelect> {
  const [updated] = await database
    .update(shop)
    .set({ publishedContent: null, publishedAt: null, updatedAt: input.now })
    .where(
      input.expectedUpdatedAt === undefined
        ? ownedShopWhere(input.shopId, input.sellerId)
        : and(
            ownedShopWhere(input.shopId, input.sellerId),
            eq(shop.updatedAt, input.expectedUpdatedAt),
          ),
    )
    .returning();

  if (updated === undefined) {
    throw input.expectedUpdatedAt === undefined
      ? new WebsiteOwnershipError()
      : new WebsiteConflictError();
  }

  return updated;
}
