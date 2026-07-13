import "server-only";

import { and, eq, isNotNull, sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import type { TablesRelationalConfig } from "drizzle-orm/relations";

import { shop, shopMembership } from "@/db/schema";
import { normalizeSubdomain } from "@/lib/tenancy";
import { websitePublishedContentSchema } from "@/lib/websites";

export type ShopDatabase<
  TQueryResult extends PgQueryResultHKT,
  TFullSchema extends Record<string, unknown>,
  TSchema extends TablesRelationalConfig,
> = PgDatabase<TQueryResult, TFullSchema, TSchema>;

export function ownedMembershipWhere(shopId: string, userId: string) {
  return and(eq(shopMembership.shopId, shopId), eq(shopMembership.userId, userId))!;
}

export function ownedShopWhere(shopId: string, userId: string) {
  return and(
    eq(shop.id, shopId),
    sql`exists (select 1 from ${shopMembership} where ${shopMembership.shopId} = ${shop.id} and ${shopMembership.userId} = ${userId})`,
  )!;
}

export async function findShopBySubdomain<
  TQueryResult extends PgQueryResultHKT,
  TFullSchema extends Record<string, unknown>,
  TSchema extends TablesRelationalConfig,
>(database: ShopDatabase<TQueryResult, TFullSchema, TSchema>, subdomain: string) {
  const [result] = await database
    .select({
      id: shop.id,
      subdomain: shop.subdomain,
      publishedContent: shop.publishedContent,
    })
    .from(shop)
    .where(and(eq(shop.subdomain, normalizeSubdomain(subdomain)), isNotNull(shop.publishedContent)))
    .limit(1);

  return result === undefined
    ? null
    : {
        ...result,
        publishedContent: websitePublishedContentSchema.parse(result.publishedContent),
      };
}

export async function findOwnedShop<
  TQueryResult extends PgQueryResultHKT,
  TFullSchema extends Record<string, unknown>,
  TSchema extends TablesRelationalConfig,
>(database: ShopDatabase<TQueryResult, TFullSchema, TSchema>, shopId: string, userId: string) {
  const [result] = await database
    .select({ shop })
    .from(shop)
    .innerJoin(shopMembership, eq(shopMembership.shopId, shop.id))
    .where(ownedMembershipWhere(shopId, userId))
    .limit(1);

  return result?.shop ?? null;
}

export async function findSellerShop<
  TQueryResult extends PgQueryResultHKT,
  TFullSchema extends Record<string, unknown>,
  TSchema extends TablesRelationalConfig,
>(database: ShopDatabase<TQueryResult, TFullSchema, TSchema>, userId: string) {
  const [result] = await database
    .select({ shop })
    .from(shop)
    .innerJoin(shopMembership, eq(shopMembership.shopId, shop.id))
    .where(eq(shopMembership.userId, userId))
    .limit(1);

  return result?.shop ?? null;
}

export async function updateOwnedShopSubdomain<
  TQueryResult extends PgQueryResultHKT,
  TFullSchema extends Record<string, unknown>,
  TSchema extends TablesRelationalConfig,
>(
  database: ShopDatabase<TQueryResult, TFullSchema, TSchema>,
  shopId: string,
  userId: string,
  subdomain: string,
) {
  const [result] = await database
    .update(shop)
    .set({ subdomain: normalizeSubdomain(subdomain), updatedAt: new Date() })
    .where(ownedShopWhere(shopId, userId))
    .returning();

  return result ?? null;
}
