import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BrandedWebsite } from "@/components/branded-website";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { getDatabase } from "@/db/client";
import { websiteDraftContentSchema, websitePublishedContentSchema } from "@/lib/websites";
import { createAuthContext } from "@/server/auth-context";
import { requireSellerSubscriptionAccess } from "@/server/billing-service";
import { getWebsiteAssetUrl } from "@/server/r2";
import { findSellerShop } from "@/server/shops";
import { SubscriptionAccessError } from "@/server/subscriptions";

export default async function WebsitePreviewPage() {
  const authContext = await createAuthContext(await headers());

  if (authContext.identity === null) {
    redirect("/auth?next=/setup/website/preview");
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
  const parsed = websitePublishedContentSchema.safeParse(draft);

  return (
    <>
      <SiteHeader variant="app" user={authContext.user} />
      <div className="bg-background px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto w-full max-w-5xl">
          <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                Saved draft preview
              </p>
              <h1 className="mt-3 text-4xl font-semibold leading-none tracking-[-0.055em] sm:text-5xl">
                This is what your website will look like.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
                Preview uses the latest saved draft. Unsaved changes stay in the editor until you
                save them.
              </p>
            </div>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-input px-5 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              href="/setup/website"
            >
              Back to editor
            </Link>
          </div>

          {shop === null ? (
            <main id="main-content" className="mt-8">
              <Card className="gap-0 py-0">
                <CardContent className="p-5 sm:p-7">
                  <h2 className="text-xl font-semibold tracking-tight">No saved draft yet</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Save your first draft in the website editor to preview it here.
                  </p>
                </CardContent>
              </Card>
            </main>
          ) : parsed.success ? (
            <div className="mt-8 overflow-hidden rounded-xl border border-border bg-card">
              <BrandedWebsite
                content={parsed.data}
                logoUrl={draft.logo === undefined ? undefined : getWebsiteAssetUrl(draft.logo.key)}
                heroUrl={draft.hero === undefined ? undefined : getWebsiteAssetUrl(draft.hero.key)}
              />
            </div>
          ) : (
            <main id="main-content" className="mt-8">
              <Card className="gap-0 border-dashed py-0">
                <CardContent className="p-5 sm:p-7">
                  <h2 className="text-xl font-semibold tracking-tight">Keep building your draft</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Add a business name and description in the editor before previewing a public
                    website.
                  </p>
                </CardContent>
              </Card>
            </main>
          )}
        </div>
      </div>
    </>
  );
}
