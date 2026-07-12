import { describe, expect, it } from "vitest";

import { RESERVED_SUBDOMAINS, normalizeSubdomain, resolveHost } from "@/lib/tenancy";

describe("normalizeSubdomain", () => {
  it("trims and lowercases a valid DNS label", () => {
    expect(normalizeSubdomain("  My-Shop  ")).toBe("my-shop");
  });

  it("rejects reserved and malformed labels", () => {
    for (const value of [
      ...RESERVED_SUBDOMAINS,
      "-shop",
      "shop-",
      "two.labels",
      "shop_name",
      "x".repeat(64),
    ]) {
      expect(() => normalizeSubdomain(value)).toThrow();
    }
  });
});

describe("resolveHost", () => {
  const platformDomain = "tskc.example";

  it("resolves the configured platform host", () => {
    expect(resolveHost("TSKC.EXAMPLE", platformDomain)).toEqual({
      kind: "platform",
    });
  });

  it("resolves one valid seller subdomain", () => {
    expect(resolveHost("my-shop.tskc.example", platformDomain)).toEqual({
      kind: "storefront",
      subdomain: "my-shop",
    });
  });

  it("rejects missing, nested, reserved, and unrelated hosts", () => {
    for (const host of [
      null,
      "www.tskc.example",
      "a.b.tskc.example",
      "shop.example",
      "shop.tskc.example, attacker.example",
    ]) {
      expect(resolveHost(host, platformDomain)).toEqual({ kind: "unknown" });
    }
  });

  it("keeps localhost as a platform-only local default", () => {
    expect(resolveHost("localhost:3000", "localhost:3000")).toEqual({
      kind: "platform",
    });
    expect(resolveHost("shop.localhost:3000", "localhost:3000")).toEqual({
      kind: "unknown",
    });
  });
});
