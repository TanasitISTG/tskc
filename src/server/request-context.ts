import "server-only";

import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import type { TablesRelationalConfig } from "drizzle-orm/relations";

import { getDatabase } from "@/db/client";
import type { WebsitePublishedContent } from "@/lib/websites";
import { resolveHost } from "@/lib/tenancy";
import { hasShopSubscriptionAccess } from "@/server/billing-service";
import { findShopBySubdomain, type ShopDatabase } from "@/server/shops";

export type RequestTenant =
  | { kind: "platform" }
  | { kind: "unknown" }
  | { kind: "suspended"; subdomain: string }
  | {
      kind: "storefront";
      subdomain: string;
      shop: { id: string; subdomain: string; publishedContent: WebsitePublishedContent };
    };

async function resolveStorefront<
  TQueryResult extends PgQueryResultHKT,
  TFullSchema extends Record<string, unknown>,
  TSchema extends TablesRelationalConfig,
>(
  database: ShopDatabase<TQueryResult, TFullSchema, TSchema>,
  subdomain: string,
): Promise<RequestTenant> {
  const resolvedShop = await findShopBySubdomain(database, subdomain);

  if (resolvedShop === null) {
    return { kind: "unknown" };
  }

  if (!(await hasShopSubscriptionAccess(resolvedShop.id, new Date(), database))) {
    return { kind: "suspended", subdomain };
  }

  return { kind: "storefront", subdomain, shop: resolvedShop };
}

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

  return database === undefined
    ? resolveStorefront(getDatabase(), hostContext.subdomain)
    : resolveStorefront(database, hostContext.subdomain);
}
