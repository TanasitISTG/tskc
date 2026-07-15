import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  captureRequestError: vi.fn(),
  init: vi.fn(),
}));

import * as Sentry from "@sentry/nextjs";
import { onRequestError, register } from "../instrumentation";

afterEach(() => {
  delete process.env.NEXT_RUNTIME;
  delete process.env.NEXT_PUBLIC_SENTRY_DSN;
  delete process.env.SENTRY_DSN;
  vi.clearAllMocks();
});

describe("Sentry instrumentation", () => {
  it("exports Sentry's request error hook", () => {
    expect(onRequestError).toBe(Sentry.captureRequestError);
  });

  it("initializes the server and edge SDKs through register", async () => {
    process.env.NEXT_RUNTIME = "nodejs";
    await register();
    process.env.NEXT_RUNTIME = "edge";
    await register();

    expect(vi.mocked(Sentry.init)).toHaveBeenCalledTimes(2);
  });
});

describe("client instrumentation", () => {
  it("initializes with the public DSN", async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://public@example.ingest.sentry.io/1";
    await import("../instrumentation-client");

    expect(vi.mocked(Sentry.init)).toHaveBeenCalledWith({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0,
      profilesSampleRate: 0,
    });
  });
});
