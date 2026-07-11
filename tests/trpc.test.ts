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

  it("allows an authenticated seller through protected procedures", async () => {
    const caller = appRouter.createCaller({
      identity: { userId: "seller-1" },
    });

    await expect(caller.auth.me()).resolves.toEqual({
      userId: "seller-1",
    });
  });
});
