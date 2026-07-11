import "server-only";

import { initTRPC, TRPCError } from "@trpc/server";

import { AuthError, requireSession } from "@/lib/auth-guards";
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

export const appRouter = router({
  health: publicProcedure.query(() => ({ status: "ok" as const })),
  auth: router({
    me: protectedProcedure.query(({ ctx }) => ({
      userId: ctx.identity.userId,
    })),
  }),
});

export type AppRouter = typeof appRouter;
