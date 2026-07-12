import { describe, expect, it } from "vitest";

import { AuthError, requireSession, safeReturnTo } from "@/lib/auth-guards";

describe("safeReturnTo", () => {
  it("accepts an internal return path", () => {
    expect(safeReturnTo("/setup/website?step=identity")).toBe("/setup/website?step=identity");
  });

  it("falls back to home for external or protocol-relative paths", () => {
    expect(safeReturnTo("https://attacker.example")).toBe("/");
    expect(safeReturnTo("//attacker.example")).toBe("/");
    expect(safeReturnTo(null)).toBe("/");
  });
});

describe("auth guards", () => {
  const seller = { userId: "seller-1" };

  it("rejects protected actions without a session", () => {
    expect(() => requireSession(null)).toThrow(AuthError);
    expect(() => requireSession(null)).toThrow("UNAUTHORIZED");
  });

  it("returns the authenticated seller identity", () => {
    expect(requireSession(seller)).toEqual(seller);
  });
});
