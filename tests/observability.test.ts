import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

import * as Sentry from "@sentry/nextjs";
import { logEvent } from "@/server/observability";

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("logEvent", () => {
  it("emits a structured JSON line to console.info for info level", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    logEvent("info", "test.event", { key: "value" });
    expect(spy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(spy.mock.calls[0][0]);
    expect(parsed.level).toBe("info");
    expect(parsed.event).toBe("test.event");
    expect(parsed.key).toBe("value");
    expect(parsed.ts).toBeDefined();
  });

  it("captures errors to Sentry with the original error", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("boom");
    logEvent("error", "test.error", { error });
    expect(vi.mocked(Sentry.captureException)).toHaveBeenCalledWith(
      error,
      expect.objectContaining({ extra: { error } }),
    );
  });

  it("creates a fallback Error when no Error instance is provided", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    logEvent("error", "test.error");
    expect(vi.mocked(Sentry.captureException)).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object),
    );
  });

  it("captures warnings to Sentry", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    logEvent("warn", "test.warn", { key: "value" });
    expect(vi.mocked(Sentry.captureMessage)).toHaveBeenCalledWith("test.warn", "warning");
  });

  it("does not capture info to Sentry", () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    logEvent("info", "test.info");
    expect(vi.mocked(Sentry.captureException)).not.toHaveBeenCalled();
    expect(vi.mocked(Sentry.captureMessage)).not.toHaveBeenCalled();
  });
});
