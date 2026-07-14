import { describe, expect, it } from "vitest";

import {
  emptyWebsiteFormValues,
  getWebsiteNextAction,
  websiteDraftContentSchema,
  websitePublishedContentSchema,
  websiteValuesToContent,
} from "@/lib/websites";

const completeContent = {
  businessName: "North Star Studio",
  description: "Independent ceramics made in Bangkok.",
};

describe("website management next action", () => {
  it("asks a seller without access to choose or restore the plan", () => {
    expect(
      getWebsiteNextAction({
        hasSubscription: false,
        accessAllowed: false,
        hasShop: false,
        isPublishable: false,
        isPublished: false,
      }),
    ).toBe("choose-plan");
  });

  it("moves an active seller through setup, publish, and management", () => {
    const active = {
      hasSubscription: true,
      accessAllowed: true,
      hasShop: true,
    } as const;

    expect(getWebsiteNextAction({ ...active, isPublishable: false, isPublished: false })).toBe(
      "finish-setup",
    );
    expect(getWebsiteNextAction({ ...active, isPublishable: true, isPublished: false })).toBe(
      "publish",
    );
    expect(getWebsiteNextAction({ ...active, isPublishable: true, isPublished: true })).toBe(
      "manage",
    );
  });
});

describe("website content validation", () => {
  it("allows incomplete drafts but requires publishable identity", () => {
    expect(websiteDraftContentSchema.parse({ tagline: "Made slowly" })).toEqual({
      tagline: "Made slowly",
    });
    expect(websitePublishedContentSchema.safeParse({ tagline: "Made slowly" }).success).toBe(false);
    expect(websitePublishedContentSchema.parse(completeContent)).toEqual(completeContent);
  });

  it.each([
    ["businessName", 80],
    ["description", 1000],
    ["tagline", 120],
    ["email", 254],
    ["phone", 30],
    ["address", 300],
  ] as const)("enforces the %s character limit", (field, limit) => {
    expect(websiteDraftContentSchema.safeParse({ [field]: "x".repeat(limit) }).success).toBe(
      field !== "email" && field !== "phone",
    );
    expect(websiteDraftContentSchema.safeParse({ [field]: "x".repeat(limit + 1) }).success).toBe(
      false,
    );
  });

  it("validates optional contact and accent fields", () => {
    const maxEmail = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(61)}`;
    const maxPhone = `+${"1".repeat(29)}`;

    expect(
      websiteDraftContentSchema.parse({
        email: maxEmail,
        phone: maxPhone,
        accentColor: "#0A84FF",
      }),
    ).toMatchObject({ email: maxEmail, phone: maxPhone, accentColor: "#0A84FF" });

    for (const invalid of [
      { email: "not-an-email" },
      { phone: "call-me" },
      { accentColor: "blue" },
      { accentColor: "#abc" },
    ]) {
      expect(websiteDraftContentSchema.safeParse(invalid).success).toBe(false);
    }
  });

  it("accepts one credential-free HTTPS link up to 2,048 characters", () => {
    const prefix = "https://example.com/";
    const longestLink = `${prefix}${"x".repeat(2048 - prefix.length)}`;

    expect(websiteDraftContentSchema.parse({ primaryLink: longestLink }).primaryLink).toBe(
      longestLink,
    );

    for (const primaryLink of [
      "http://example.com",
      "https://user:password@example.com",
      "mailto:hello@example.com",
      `https://example.com/${"x".repeat(2030)}`,
    ]) {
      expect(websiteDraftContentSchema.safeParse({ primaryLink }).success).toBe(false);
    }
  });

  it("omits blank optional form values without losing retained strings", () => {
    const values = { ...emptyWebsiteFormValues, businessName: "  North Star Studio  " };

    expect(values.businessName).toBe("  North Star Studio  ");
    expect(websiteValuesToContent(values)).toEqual({ businessName: "North Star Studio" });
  });
});
