import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db/client", () => ({
  createDatabase: vi.fn(),
}));

import { createDatabase } from "@/db/client";
import type { ServerEnv } from "@/lib/env";
import { runHealthChecks } from "@/server/health";

const fullEnv: ServerEnv = {
  platformDomain: "tskc.example",
  databaseUrl: "postgres://localhost/tskc",
  betterAuth: {
    secret: "a-secret-with-at-least-thirty-two-characters",
    url: "https://tskc.example",
  },
  google: { clientId: "google-id", clientSecret: "google-secret" },
  discord: { clientId: "discord-id", clientSecret: "discord-secret" },
  resend: { apiKey: "re_key", from: "noreply@tskc.example" },
  stripe: { secretKey: "sk_test_x", webhookSecret: "whsec_x", priceId: "price_x" },
  r2: undefined,
  kv: undefined,
};

const mockExecute = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createDatabase).mockReturnValue({ execute: mockExecute } as never);
  mockExecute.mockResolvedValue({ rows: [{ "?column?": 1 }] });
});

describe("runHealthChecks", () => {
  it("returns ok when all checks pass", async () => {
    await expect(runHealthChecks(fullEnv)).resolves.toEqual({
      status: "ok",
      checks: { auth: "ok", stripe: "ok", db: "ok" },
    });
  });

  it("returns degraded with db fail when the database query fails", async () => {
    mockExecute.mockRejectedValueOnce(new Error("connection refused"));
    const result = await runHealthChecks(fullEnv);
    expect(result.status).toBe("degraded");
    expect(result.checks.db).toBe("fail");
  });

  it("returns degraded with db fail when databaseUrl is missing", async () => {
    const result = await runHealthChecks({ ...fullEnv, databaseUrl: undefined });
    expect(result.status).toBe("degraded");
    expect(result.checks.db).toBe("fail");
  });

  it("returns degraded with auth fail when auth config is incomplete", async () => {
    const result = await runHealthChecks({ ...fullEnv, betterAuth: undefined });
    expect(result.status).toBe("degraded");
    expect(result.checks.auth).toBe("fail");
  });

  it("returns degraded with stripe fail when stripe config is missing", async () => {
    const result = await runHealthChecks({ ...fullEnv, stripe: undefined });
    expect(result.status).toBe("degraded");
    expect(result.checks.stripe).toBe("fail");
  });

  it("does not expose secret values in the result", async () => {
    const result = await runHealthChecks(fullEnv);
    const json = JSON.stringify(result);
    expect(json).not.toContain("sk_test_x");
    expect(json).not.toContain("whsec_x");
    expect(json).not.toContain("a-secret");
    expect(json).not.toContain("google-secret");
    expect(json).not.toContain("re_key");
  });
});
