import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { LANDING_AUTH_HREF } from "@/lib/landing";
import { createAuthContext } from "@/server/auth-context";

export default async function WebsiteSetupPage() {
  const { identity } = await createAuthContext(await headers());

  if (identity === null) {
    redirect(LANDING_AUTH_HREF);
  }

  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center bg-background px-5 py-10"
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
            Your account is ready. Plan selection and website setup will appear here as they become
            available.
          </p>
          <Link
            className={buttonVariants({ size: "lg", className: "mt-7 h-11 rounded-full" })}
            href="/auth"
          >
            Back to account
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
