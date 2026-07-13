import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { LANDING_AUTH_HREF } from "@/lib/landing";
import { createAuthContext } from "@/server/auth-context";
import { requireSellerSubscriptionAccess } from "@/server/billing-service";
import { SubscriptionAccessError } from "@/server/subscriptions";

export default async function WebsiteSetupPage() {
  const authContext = await createAuthContext(await headers());

  if (authContext.identity === null) {
    redirect(LANDING_AUTH_HREF);
  }

  try {
    await requireSellerSubscriptionAccess(authContext.identity.userId);
  } catch (error) {
    if (error instanceof SubscriptionAccessError) {
      redirect("/billing?access=required");
    }

    throw error;
  }

  return (
    <>
      <SiteHeader variant="app" user={authContext.user} />
      <main
        id="main-content"
        className="flex min-h-[calc(100vh-5.25rem)] items-center justify-center bg-background px-5 py-10"
      >
        <Card className="w-full max-w-xl gap-0 border-0 bg-card py-0 shadow-2xl ring-1 ring-foreground/10">
          <CardContent className="p-7 sm:p-10">
            <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              Website setup
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-[0.94] tracking-[-0.065em] sm:text-5xl">
              Your plan is the next step.
            </h1>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              Your payment is verified and your plan is active. Website identity setup continues in
              Task 6.
            </p>
            <Link
              className={buttonVariants({ size: "lg", className: "mt-7 h-11 rounded-full" })}
              href="/billing"
            >
              Manage plan
            </Link>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
