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
const billingSource = readFileSync(
  resolve(import.meta.dirname, "../src/app/billing/page.tsx"),
  "utf8",
);
const billingLoadingSource = readFileSync(
  resolve(import.meta.dirname, "../src/app/billing/loading.tsx"),
  "utf8",
);
const authContextSource = readFileSync(
  resolve(import.meta.dirname, "../src/server/auth-context.ts"),
  "utf8",
);
const authSource = readFileSync(resolve(import.meta.dirname, "../src/app/auth/page.tsx"), "utf8");
const accountSource = readFileSync(
  resolve(import.meta.dirname, "../src/app/account/page.tsx"),
  "utf8",
);
const authPanelSource = readFileSync(
  resolve(import.meta.dirname, "../src/components/auth-panel.tsx"),
  "utf8",
);
const skeletonSource = readFileSync(
  resolve(import.meta.dirname, "../src/components/ui/skeleton.tsx"),
  "utf8",
);

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
    expect(authPanelSource).toContain("FIRST_INCOMPLETE_STEP");
  });

  it("sends social sign-in directly to the protected continuation", () => {
    expect(authPanelSource).toContain("callbackURL: `${window.location.origin}${next}`");
  });

  it("redirects authenticated auth requests before rendering", () => {
    expect(authSource).toContain("createAuthContext(await headers())");
    expect(authSource).toContain("safeReturnTo");
    expect(authSource).toContain('redirect(next === "/" ? "/account" : next)');
  });

  it("uses shadcn's accessible skeleton while sign-in methods load", () => {
    expect(authPanelSource).toContain('import { Skeleton } from "@/components/ui/skeleton";');
    expect(authPanelSource).toContain("<Skeleton");
    expect(authPanelSource).not.toContain("animate-pulse");
    expect(skeletonSource).toContain('data-slot="skeleton"');
    expect(skeletonSource).toContain("animate-pulse");
    expect(authPanelSource).toContain('aria-label="Loading sign-in methods"');
    expect(authPanelSource).toContain('aria-busy="true"');
  });

  it("shows progress while the initial session is loading", () => {
    expect(authPanelSource).toContain('aria-label="Loading account"');
    expect(authPanelSource).not.toContain("Checking your account...");
    expect(authPanelSource).not.toContain("Loading your session...");
  });

  it("replaces signed-out actions with an account menu for authenticated users", () => {
    expect(pageSource).toContain("createAuthContext(requestHeaders)");
    expect(pageSource).toContain("<SiteHeader user={authContext.user} />");
    expect(headerSource).toContain("DropdownMenuTrigger");
    expect(headerSource).toContain("<DropdownMenuGroup>");
    expect(headerSource).toContain("AvatarFallback");
    expect(headerSource).toContain('href="/account"');
    expect(headerSource).toContain('href="/billing"');
    expect(headerSource).toContain('href="/setup/website"');
    expect(headerSource).toContain("authClient.signOut");
  });

  it("uses one website CTA for signed-out navigation", () => {
    expect(headerSource).not.toContain('href="/auth"');
    expect(pageSource).not.toContain('href="/auth"');
    expect(headerSource.match(/Get your website/g)).toHaveLength(2);
  });

  it("uses simplified account navigation on protected pages", () => {
    expect(headerSource).toContain('variant = "marketing"');
    expect(headerSource).toContain('variant === "app"');
    expect(billingSource).toContain('<SiteHeader variant="app" user={authContext.user} />');
    expect(setupSource).toContain('<SiteHeader variant="app" user={authContext.user} />');
    expect(authContextSource).toContain("user: {");
  });

  it("keeps the app header represented while billing loads", () => {
    expect(billingLoadingSource).toContain("<header");
    expect(billingLoadingSource).toContain('aria-hidden="true"');
    expect(billingLoadingSource).toContain("grid-cols-[1fr_auto]");
    expect(billingLoadingSource).toContain('className="size-11 rounded-full"');
    expect(billingLoadingSource).toContain("min-h-[calc(100vh-5.25rem)]");
  });

  it("hosts account settings on a protected app page without a back link", () => {
    expect(accountSource).toContain("createAuthContext(await headers())");
    expect(accountSource).toContain('redirect("/auth?next=/account")');
    expect(accountSource).toContain('<SiteHeader variant="app" user={authContext.user} />');
    expect(accountSource).toContain("<AccountPanel");
    expect(authPanelSource).toContain('title="Account settings"');
    expect(authPanelSource).toContain("app");
  });
});
