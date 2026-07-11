import { describe, expect, it } from "vitest";

import {
  AuthError,
  isAppRole,
  requireRole,
  requireSession,
  safeReturnTo,
} from "@/lib/auth-guards";

describe("safeReturnTo", () => {
  it("accepts an internal return path", () => {
    expect(safeReturnTo("/seller/orders?filter=open")).toBe(
      "/seller/orders?filter=open",
    );
  });

  it("falls back to home for external or protocol-relative paths", () => {
    expect(safeReturnTo("https://attacker.example")).toBe("/");
    expect(safeReturnTo("//attacker.example")).toBe("/");
    expect(safeReturnTo(null)).toBe("/");
  });
});

describe("auth guards", () => {
  const buyer = { userId: "buyer-1", roles: ["buyer"] as const };

  it("rejects protected actions without a session", () => {
    expect(() => requireSession(null)).toThrow(AuthError);
    expect(() => requireSession(null)).toThrow("UNAUTHORIZED");
  });

  it("rejects a buyer from seller-only actions", () => {
    expect(() => requireRole(buyer, "seller")).toThrow("FORBIDDEN");
  });

  it("allows the matching role", () => {
    expect(requireRole(buyer, "buyer")).toEqual(buyer);
  });
});

describe("isAppRole", () => {
  it("accepts only self-selectable account roles", () => {
    expect(isAppRole("buyer")).toBe(true);
    expect(isAppRole("seller")).toBe(true);
    expect(isAppRole("platform-owner")).toBe(false);
  });
});
