import { describe, expect, it } from "vitest";

import { authErrorDetails, hasProvider, isSyntheticEmail } from "@/lib/auth-account";

describe("authErrorDetails", () => {
  it("explains how to recover when a social account is not linked", () => {
    expect(authErrorDetails("account_not_linked")).toEqual({
      title: "This sign-in method is not connected.",
      description:
        "Sign in with the method you used before, then connect this provider from your account.",
    });
  });

  it("explains when a provider belongs to another account", () => {
    expect(authErrorDetails("account_already_linked_to_different_user")).toEqual({
      title: "This sign-in method belongs to another account.",
      description: "Sign in with that account to continue.",
    });
  });

  it("uses safe generic copy for unknown errors", () => {
    expect(authErrorDetails("unexpected_provider_error")).toEqual({
      title: "We could not sign you in.",
      description: "Try again or use another sign-in method.",
    });
  });

  it("treats inherited property names as unknown errors", () => {
    expect(authErrorDetails("toString")).toEqual({
      title: "We could not sign you in.",
      description: "Try again or use another sign-in method.",
    });
  });
});

describe("account method helpers", () => {
  it("recognizes linked providers", () => {
    expect(hasProvider([{ providerId: "google" }], "google")).toBe(true);
    expect(hasProvider([{ providerId: "google" }], "discord")).toBe(false);
  });

  it("does not offer password reset to synthetic OAuth addresses", () => {
    expect(isSyntheticEmail("abc@discord.oauth.invalid")).toBe(true);
    expect(isSyntheticEmail("seller@example.com")).toBe(false);
  });
});
