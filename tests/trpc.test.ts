import { describe, expect, it } from "vitest";

import { appRouter } from "@/server/trpc";

describe("appRouter", () => {
  it("returns an internal health status", async () => {
    const caller = appRouter.createCaller({});

    await expect(caller.health()).resolves.toEqual({ status: "ok" });
  });
});
