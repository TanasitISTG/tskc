import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { LANDING_AUTH_HREF } from "@/lib/landing";

const pageSource = readFileSync(resolve(import.meta.dirname, "../src/app/page.tsx"), "utf8");
const headerSource = readFileSync(
  resolve(import.meta.dirname, "../src/components/site-header.tsx"),
  "utf8",
);
const layoutSource = readFileSync(resolve(import.meta.dirname, "../src/app/layout.tsx"), "utf8");
const globalsSource = readFileSync(resolve(import.meta.dirname, "../src/app/globals.css"), "utf8");
const buttonSource = readFileSync(
  resolve(import.meta.dirname, "../src/components/ui/button.tsx"),
  "utf8",
);
const setupSource = readFileSync(
  resolve(import.meta.dirname, "../src/app/setup/website/page.tsx"),
  "utf8",
);
const authSource = readFileSync(resolve(import.meta.dirname, "../src/app/auth/page.tsx"), "utf8");

describe("landing page contract", () => {
  it("uses direct branded-website language", () => {
    expect(pageSource).not.toMatch(
      /\b(buyer|marketplace|catalogue|checkout|wallet|receipt|order|delivery)\b/i,
    );
  });

  it("preserves the first incomplete step through the account CTA", () => {
    expect(LANDING_AUTH_HREF).toBe("/auth?next=/setup/website");
    expect(pageSource).toContain("href={LANDING_AUTH_HREF}");
    expect(headerSource).toContain("href={LANDING_AUTH_HREF}");
  });

  it("provides a skip target and reduced-motion-safe controls", () => {
    expect(layoutSource).toContain('href="#main-content"');
    expect(layoutSource).toContain("Skip to content");
    expect(layoutSource).toContain("focus-visible:min-h-11");
    expect(globalsSource).toContain("scroll-margin-top: 1.5rem;");
    expect(globalsSource).toContain("@media (prefers-reduced-motion: reduce)");
    expect(globalsSource).toContain("transition-duration: 0s !important;");
    expect(buttonSource).not.toContain("transition-all");
  });

  it("keeps the continuation destination session-protected", () => {
    expect(setupSource).toContain("createAuthContext");
    expect(setupSource).toContain("LANDING_AUTH_HREF");
  });

  it("defaults direct account entry to the first incomplete step", () => {
    expect(authSource).toContain("FIRST_INCOMPLETE_STEP");
  });
});
