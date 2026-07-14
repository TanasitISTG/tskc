import "server-only";

import { randomUUID } from "node:crypto";
import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";

import { AuthError, requireSession } from "@/lib/auth-guards";
import { getDatabase } from "@/db/client";
import { RESERVED_SUBDOMAINS, normalizeSubdomain } from "@/lib/tenancy";
import { websiteDraftContentSchema } from "@/lib/websites";
import type { AuthContext } from "@/server/auth-context";
import { getSellerBillingStatus, requireSellerSubscriptionAccess } from "@/server/billing-service";
import { findSellerShop } from "@/server/shops";
import { deleteWebsiteAssets, unreferencedWebsiteAssetKeys } from "@/server/r2";
import {
  WebsiteConflictError,
  WebsiteOwnershipError,
  mergeWebsiteAssets,
  persistSellerWebsite,
  unpublishSellerWebsite,
  websiteConflictKind,
} from "@/server/websites";
import { SubscriptionAccessError } from "@/server/subscriptions";

const t = initTRPC.context<AuthContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

function toTrpcError(error: unknown): never {
  if (error instanceof TRPCError) {
    throw error;
  }

  if (error instanceof AuthError) {
    throw new TRPCError({ code: error.code });
  }

  if (error instanceof WebsiteConflictError) {
    throw new TRPCError({ code: "CONFLICT", message: error.message });
  }

  if (error instanceof WebsiteOwnershipError) {
    throw new TRPCError({ code: "FORBIDDEN", message: error.message });
  }

  if (error instanceof SubscriptionAccessError) {
    throw new TRPCError({ code: "FORBIDDEN", message: error.message });
  }

  if (websiteConflictKind(error) !== null) {
    throw new TRPCError({ code: "CONFLICT", message: "This website could not be saved." });
  }

  throw error;
}

export const protectedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  try {
    return await next({ ctx: { identity: requireSession(ctx.identity) } });
  } catch (error) {
    return toTrpcError(error);
  }
});

const websiteSaveInput = z
  .object({
    subdomain: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/)
      .refine((value) => !RESERVED_SUBDOMAINS.includes(value as never)),
    draftContent: websiteDraftContentSchema.omit({ logo: true, hero: true }),
    intent: z.enum(["save", "publish"]),
    expectedUpdatedAt: z.string().datetime().nullish(),
  })
  .strict();

const websiteUnpublishInput = z
  .object({
    expectedUpdatedAt: z.string().datetime().nullish(),
  })
  .strict();

const websiteRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const database = getDatabase();
    const [shop, billing] = await Promise.all([
      findSellerShop(database, ctx.identity.userId),
      getSellerBillingStatus(ctx.identity.userId, new Date(), database),
    ]);

    return { shop, billing };
  }),

  save: protectedProcedure.input(websiteSaveInput).mutation(async ({ ctx, input }) => {
    const database = getDatabase();
    const now = new Date();
    await requireSellerSubscriptionAccess(ctx.identity.userId, now, database);

    const existingShop = await findSellerShop(database, ctx.identity.userId);
    const draftContent = mergeWebsiteAssets(
      input.draftContent,
      existingShop?.draftContent ?? {},
      {},
      new Set(),
    );
    const saved = await persistSellerWebsite(database, {
      sellerId: ctx.identity.userId,
      shopId: existingShop?.id ?? randomUUID(),
      existingShop,
      subdomain: normalizeSubdomain(input.subdomain),
      draftContent,
      intent: input.intent,
      expectedUpdatedAt: input.expectedUpdatedAt ? new Date(input.expectedUpdatedAt) : undefined,
      now,
    });

    return { shop: saved };
  }),

  unpublish: protectedProcedure.input(websiteUnpublishInput).mutation(async ({ ctx, input }) => {
    const database = getDatabase();
    const now = new Date();
    await requireSellerSubscriptionAccess(ctx.identity.userId, now, database);

    const existingShop = await findSellerShop(database, ctx.identity.userId);
    if (existingShop === null) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Website not found" });
    }

    const unpublished = await unpublishSellerWebsite(database, {
      sellerId: ctx.identity.userId,
      shopId: existingShop.id,
      expectedUpdatedAt: input.expectedUpdatedAt ? new Date(input.expectedUpdatedAt) : undefined,
      now,
    });

    const replacedKeys = unreferencedWebsiteAssetKeys(
      existingShop.draftContent,
      existingShop.publishedContent,
      unpublished.draftContent,
      unpublished.publishedContent,
    );

    try {
      await deleteWebsiteAssets(replacedKeys);
    } catch {
      console.error("Failed to remove unpublished website assets after a successful update");
    }

    return { shop: unpublished };
  }),
});

export const appRouter = router({
  health: publicProcedure.query(() => ({ status: "ok" as const })),
  auth: router({
    me: protectedProcedure.query(({ ctx }) => ({
      userId: ctx.identity.userId,
    })),
  }),
  website: websiteRouter,
});

export type AppRouter = typeof appRouter;
