import { describe, expect, it } from "vitest";

import { parseServerEnv } from "@/lib/env";

describe("parseServerEnv", () => {
  it("uses a safe platform domain in local test environments", () => {
    expect(parseServerEnv({ NODE_ENV: "test" })).toMatchObject({
      platformDomain: "localhost:3000",
    });
  });

  it("requires PLATFORM_DOMAIN in production", () => {
    expect(() => parseServerEnv({ NODE_ENV: "production" })).toThrow(
      "PLATFORM_DOMAIN is required in production",
    );
  });

  it("requires complete auth infrastructure in production", () => {
    expect(() =>
      parseServerEnv({
        NODE_ENV: "production",
        PLATFORM_DOMAIN: "tskc.example",
      }),
    ).toThrow("DATABASE_URL is required in production");
  });

  it("rejects partial OAuth provider credentials", () => {
    expect(() =>
      parseServerEnv({
        NODE_ENV: "test",
        GOOGLE_CLIENT_ID: "google-client-id",
      }),
    ).toThrow("Google OAuth configuration must set all or none of its variables");
  });

  it("rejects partial R2 credentials", () => {
    expect(() =>
      parseServerEnv({
        NODE_ENV: "test",
        R2_BUCKET: "tskc-files",
      }),
    ).toThrow("R2 configuration must set all or none of its variables");
  });

  it("rejects partial Better Auth credentials", () => {
    expect(() =>
      parseServerEnv({
        NODE_ENV: "test",
        BETTER_AUTH_URL: "http://localhost:3000",
      }),
    ).toThrow("Better Auth configuration must set all or none of its variables");
  });

  it("does not expose unapproved payment-provider configuration", () => {
    expect(
      parseServerEnv({
        NODE_ENV: "test",
        SLIP2GO_BASE_URL: "https://api.slip2go.example",
        SLIP2GO_API_KEY: "slip2go-key",
      }),
    ).not.toHaveProperty("slip2Go");
  });

  it("returns fully configured integration groups", () => {
    expect(
      parseServerEnv({
        NODE_ENV: "production",
        PLATFORM_DOMAIN: "tskc.example",
        DATABASE_URL: "postgres://user:password@localhost:5432/tskc",
        BETTER_AUTH_SECRET: "a-secret-with-at-least-thirty-two-characters",
        BETTER_AUTH_URL: "https://tskc.example",
        GOOGLE_CLIENT_ID: "google-client-id",
        GOOGLE_CLIENT_SECRET: "google-client-secret",
        DISCORD_CLIENT_ID: "discord-client-id",
        DISCORD_CLIENT_SECRET: "discord-client-secret",
        R2_ENDPOINT: "https://account.r2.cloudflarestorage.com",
        R2_BUCKET: "tskc-files",
        R2_ACCESS_KEY_ID: "access-key",
        R2_SECRET_ACCESS_KEY: "secret-key",
        RESEND_API_KEY: "re_test",
        RESEND_FROM: "TSKC <noreply@tskc.example>",
      }),
    ).toMatchObject({
      platformDomain: "tskc.example",
      databaseUrl: "postgres://user:password@localhost:5432/tskc",
      betterAuth: {
        secret: "a-secret-with-at-least-thirty-two-characters",
        url: "https://tskc.example",
      },
      google: {
        clientId: "google-client-id",
      },
      r2: {
        endpoint: "https://account.r2.cloudflarestorage.com",
        bucket: "tskc-files",
      },
      resend: {
        apiKey: "re_test",
        from: "TSKC <noreply@tskc.example>",
      },
    });
  });
});
