import "server-only";

import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import type { TablesRelationalConfig } from "drizzle-orm/relations";

import { getDatabase } from "@/db/client";
import type { shop } from "@/db/schema";
import { resolveHost } from "@/lib/tenancy";
import { findShopBySubdomain, type ShopDatabase } from "@/server/shops";

export type RequestTenant =
  | { kind: "platform" }
  | { kind: "unknown" }
  | { kind: "storefront"; subdomain: string; shop: typeof shop.$inferSelect };

export function resolveRequestTenant(
  headers: Headers,
  platformDomain: string,
): Promise<RequestTenant>;
export function resolveRequestTenant<
  TQueryResult extends PgQueryResultHKT,
  TFullSchema extends Record<string, unknown>,
  TSchema extends TablesRelationalConfig,
>(
  headers: Headers,
  platformDomain: string,
  database: ShopDatabase<TQueryResult, TFullSchema, TSchema>,
): Promise<RequestTenant>;
export async function resolveRequestTenant<
  TQueryResult extends PgQueryResultHKT,
  TFullSchema extends Record<string, unknown>,
  TSchema extends TablesRelationalConfig,
>(
  headers: Headers,
  platformDomain: string,
  database?: ShopDatabase<TQueryResult, TFullSchema, TSchema>,
): Promise<RequestTenant> {
  const hostContext = resolveHost(headers.get("host"), platformDomain);

  if (hostContext.kind !== "storefront") {
    return hostContext;
  }

  const resolvedShop =
    database === undefined
      ? await findShopBySubdomain(getDatabase(), hostContext.subdomain)
      : await findShopBySubdomain(database, hostContext.subdomain);

  if (resolvedShop === null) {
    return { kind: "unknown" };
  }

  return { ...hostContext, shop: resolvedShop };
}
