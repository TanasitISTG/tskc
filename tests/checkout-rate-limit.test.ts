import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@vercel/kv", () => ({
  kv: {
    incr: vi.fn(),
    expire: vi.fn(),
  },
}));

import { kv } from "@vercel/kv";
import { checkCheckoutRateLimit } from "@/server/checkout-rate-limit";

const mockIncr = vi.mocked(kv.incr);
const mockExpire = vi.mocked(kv.expire);

beforeEach(() => {
  vi.clearAllMocks();
  mockExpire.mockResolvedValue(1);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("checkCheckoutRateLimit", () => {
  it("allows requests when KV is not configured", async () => {
    const original = process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_URL;
    await expect(checkCheckoutRateLimit("seller-1")).resolves.toBe(true);
    expect(mockIncr).not.toHaveBeenCalled();
    process.env.KV_REST_API_URL = original;
  });

  it("allows requests under the limit", async () => {
    process.env.KV_REST_API_URL = "https://kv.example.com";
    mockIncr.mockResolvedValueOnce(3);
    await expect(checkCheckoutRateLimit("seller-1")).resolves.toBe(true);
    expect(mockIncr).toHaveBeenCalledWith("checkout:seller-1");
  });

  it("blocks requests over the limit", async () => {
    process.env.KV_REST_API_URL = "https://kv.example.com";
    mockIncr.mockResolvedValueOnce(6);
    await expect(checkCheckoutRateLimit("seller-1")).resolves.toBe(false);
  });

  it("sets expiry on the first request", async () => {
    process.env.KV_REST_API_URL = "https://kv.example.com";
    mockIncr.mockResolvedValueOnce(1);
    await checkCheckoutRateLimit("seller-1");
    expect(mockExpire).toHaveBeenCalledWith("checkout:seller-1", 900);
  });

  it("does not set expiry on subsequent requests", async () => {
    process.env.KV_REST_API_URL = "https://kv.example.com";
    mockIncr.mockResolvedValueOnce(2);
    await checkCheckoutRateLimit("seller-1");
    expect(mockExpire).not.toHaveBeenCalled();
  });

  it("fails open when KV throws", async () => {
    process.env.KV_REST_API_URL = "https://kv.example.com";
    mockIncr.mockRejectedValueOnce(new Error("network error"));
    await expect(checkCheckoutRateLimit("seller-1")).resolves.toBe(true);
  });
});
