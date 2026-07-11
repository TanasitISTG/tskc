import { describe, expect, it } from "vitest";

import { appRouter } from "@/server/trpc";

describe("appRouter", () => {
  it("returns an internal health status", async () => {
    const caller = appRouter.createCaller({ identity: null });

    await expect(caller.health()).resolves.toEqual({ status: "ok" });
  });

  it("rejects unauthenticated protected procedures", async () => {
    const caller = appRouter.createCaller({ identity: null });

    await expect(caller.auth.me()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects buyers from seller procedures", async () => {
    const caller = appRouter.createCaller({
      identity: { userId: "buyer-1", roles: ["buyer"] },
    });

    await expect(caller.auth.sellerIdentity()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows sellers through seller procedures", async () => {
    const caller = appRouter.createCaller({
      identity: { userId: "seller-1", roles: ["seller"] },
    });

    await expect(caller.auth.sellerIdentity()).resolves.toEqual({
      userId: "seller-1",
    });
  });
});
