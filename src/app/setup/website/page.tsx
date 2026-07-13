import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { WebsiteForm } from "@/app/setup/website/website-form";
import { SiteHeader } from "@/components/site-header";
import { getDatabase } from "@/db/client";
import { LANDING_AUTH_HREF } from "@/lib/landing";
import {
  websiteContentToValues,
  websiteDraftContentSchema,
  type WebsiteFormState,
} from "@/lib/websites";
import { createAuthContext } from "@/server/auth-context";
import { requireSellerSubscriptionAccess } from "@/server/billing-service";
import { getWebsiteAssetUrl } from "@/server/r2";
import { findSellerShop } from "@/server/shops";
import { SubscriptionAccessError } from "@/server/subscriptions";

export default async function WebsiteSetupPage() {
  const authContext = await createAuthContext(await headers());

  if (authContext.identity === null) {
    redirect(LANDING_AUTH_HREF);
  }

  const database = getDatabase();

  try {
    await requireSellerSubscriptionAccess(authContext.identity.userId, new Date(), database);
  } catch (error) {
    if (error instanceof SubscriptionAccessError) {
      redirect("/billing?access=required");
    }

    throw error;
  }

  const shop = await findSellerShop(database, authContext.identity.userId);
  const draft = websiteDraftContentSchema.parse(shop?.draftContent ?? {});
  const initialState: WebsiteFormState = {
    status: "idle",
    values: websiteContentToValues(shop?.subdomain ?? "", draft),
    fieldErrors: {},
    message: "",
    publishedAt: shop?.publishedAt?.toISOString(),
  };
  const storedAssets = {
    logo: draft.logo && { ...draft.logo, url: getWebsiteAssetUrl(draft.logo.key) },
    hero: draft.hero && { ...draft.hero, url: getWebsiteAssetUrl(draft.hero.key) },
  };

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

          <WebsiteForm
            key={shop?.updatedAt.toISOString() ?? "new"}
            initialState={initialState}
            storedAssets={storedAssets}
          />
        </div>
      </main>
    </>
  );
}
