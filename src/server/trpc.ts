import "server-only";

import { initTRPC, TRPCError } from "@trpc/server";

import {
  AuthError,
  requireRole,
  requireSession,
  type AppRole,
} from "@/lib/auth-guards";
import type { AuthContext } from "@/server/auth-context";

const t = initTRPC.context<AuthContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

function toTrpcError(error: unknown): never {
  if (error instanceof AuthError) {
    throw new TRPCError({ code: error.code });
  }

  throw error;
}

export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  try {
    return next({ ctx: { identity: requireSession(ctx.identity) } });
  } catch (error) {
    return toTrpcError(error);
  }
});

function roleProcedure(role: AppRole) {
  return protectedProcedure.use(({ ctx, next }) => {
    try {
      return next({ ctx: { identity: requireRole(ctx.identity, role) } });
    } catch (error) {
      return toTrpcError(error);
    }
  });
}

export const buyerProcedure = roleProcedure("buyer");
export const sellerProcedure = roleProcedure("seller");

export const appRouter = router({
  health: publicProcedure.query(() => ({ status: "ok" as const })),
  auth: router({
    me: protectedProcedure.query(({ ctx }) => ctx.identity),
    sellerIdentity: sellerProcedure.query(({ ctx }) => ({
      userId: ctx.identity.userId,
    })),
  }),
});

export type AppRouter = typeof appRouter;
