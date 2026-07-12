import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { authErrorDetails } from "@/lib/auth-account";

type AuthErrorPageProps = {
  searchParams: Promise<{ error?: string | string[] }>;
};

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const { error } = await searchParams;
  const details = authErrorDetails(typeof error === "string" ? error : null);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10 sm:px-8">
      <Card className="w-full max-w-xl gap-0 border-0 bg-card py-0 shadow-2xl ring-1 ring-foreground/10">
        <CardContent className="p-7 sm:p-10">
          <Link
            className="inline-flex min-h-11 items-center text-sm text-muted-foreground transition-colors hover:text-ring"
            href="/"
          >
            ← Back
          </Link>
          <h1 className="mt-4 text-4xl font-semibold leading-[0.94] tracking-[-0.065em] sm:text-5xl">
            {details.title}
          </h1>
          <Separator className="my-7" />
          <p className="text-base leading-relaxed text-muted-foreground">{details.description}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              className={buttonVariants({ size: "lg", className: "h-11 flex-1 rounded-full" })}
              href="/auth"
            >
              Sign in
            </Link>
            <Link
              className={buttonVariants({
                variant: "outline",
                size: "lg",
                className: "h-11 flex-1 rounded-full",
              })}
              href="/"
            >
              Go home
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
