import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { WebsiteForm } from "@/app/setup/website/website-form";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { getDatabase } from "@/db/client";
import { parseServerEnv } from "@/lib/env";
import { LANDING_AUTH_HREF } from "@/lib/landing";
import {
  getWebsiteNextAction,
  websiteContentToValues,
  websiteDraftContentSchema,
  websitePublishedContentSchema,
  type WebsiteFormState,
} from "@/lib/websites";
import { createAuthContext } from "@/server/auth-context";
import { getSellerBillingStatus } from "@/server/billing-service";
import { getWebsiteAssetUrl } from "@/server/r2";
import { findSellerShop } from "@/server/shops";

export default async function WebsiteSetupPage() {
  const authContext = await createAuthContext(await headers());

  if (authContext.identity === null) {
    redirect(LANDING_AUTH_HREF);
  }

  const database = getDatabase();
  const [shop, billing] = await Promise.all([
    findSellerShop(database, authContext.identity.userId),
    getSellerBillingStatus(authContext.identity.userId, new Date(), database),
  ]);
  const draft = websiteDraftContentSchema.parse(shop?.draftContent ?? {});
  const isPublishable = websitePublishedContentSchema.safeParse(draft).success;
  const hasAccess = billing?.accessAllowed === true;
  const nextAction = getWebsiteNextAction({
    hasSubscription: billing !== null,
    accessAllowed: hasAccess,
    hasShop: shop !== null,
    isPublishable,
    isPublished: shop !== null && shop.publishedContent !== null,
  });
  const actionCopy = {
    "choose-plan": {
      title: billing === null ? "Choose your website plan" : "Restore your website plan",
      body:
        billing === null
          ? "An active plan unlocks editing, preview, and publishing for your website."
          : "Your plan is not active, so editing and publishing are paused until access is restored.",
      href: "/billing?access=required",
      label: billing === null ? "Choose plan" : "Open billing",
    },
    "finish-setup": {
      title: "Finish your website setup",
      body: "Add the business name and description required for a public website, then save or preview it.",
      href: "#website-editor",
      label: "Continue setup",
    },
    publish: {
      title: "Your draft is ready to publish",
      body: "Preview the saved draft, then publish it when everything looks right.",
      href: "/setup/website/preview",
      label: "Preview draft",
    },
    manage: {
      title: "Manage your published website",
      body: "Your public snapshot stays live until you publish another draft or unpublish it.",
      href: "/setup/website/preview",
      label: "Preview draft",
    },
  }[nextAction];
  const platformDomain = parseServerEnv(process.env).platformDomain;
  const publicUrl =
    shop !== null && shop.publishedContent !== null
      ? `${platformDomain.startsWith("localhost") ? "http" : "https"}://${shop.subdomain}.${platformDomain}`
      : undefined;
  const initialState: WebsiteFormState = {
    status: "idle",
    values: websiteContentToValues(shop?.subdomain ?? "", draft),
    fieldErrors: {},
    message: "",
    publishedAt: shop?.publishedAt?.toISOString(),
    updatedAt: shop?.updatedAt.toISOString(),
  };
  const storedAssets = hasAccess
    ? {
        logo: draft.logo && { ...draft.logo, url: getWebsiteAssetUrl(draft.logo.key) },
        hero: draft.hero && { ...draft.hero, url: getWebsiteAssetUrl(draft.hero.key) },
      }
    : {};

  return (
    <>
      <SiteHeader variant="app" user={authContext.user} />
      <main id="main-content" className="bg-background px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto w-full max-w-5xl">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              Website setup
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-none tracking-[-0.055em] sm:text-5xl">
              Make your storefront unmistakably yours.
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Save work-in-progress whenever you need. Publishing creates the exact public snapshot
              visitors will see until you publish again.
            </p>
          </div>

          <Card className="mt-8 gap-0 py-0">
            <CardContent className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
              <div>
                <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                  {billing === null ? "No active plan" : "Branded website plan"}
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">{actionCopy.title}</h2>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {actionCopy.body}
                </p>
              </div>
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                href={actionCopy.href}
              >
                {actionCopy.label}
              </Link>
            </CardContent>
          </Card>

          {hasAccess ? (
            <div id="website-editor">
              <WebsiteForm
                key={shop?.updatedAt.toISOString() ?? "new"}
                initialState={initialState}
                storedAssets={storedAssets}
                publicUrl={publicUrl}
                platformDomain={platformDomain}
              />
            </div>
          ) : (
            <Card className="mt-6 gap-0 border-dashed py-0">
              <CardContent className="p-5 sm:p-7">
                <h2 className="text-xl font-semibold tracking-tight">Website editing is paused</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Choose or restore an active plan to edit, preview, publish, or unpublish this
                  website. Your saved information remains protected in your account.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </>
  );
}
