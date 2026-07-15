"use client";

import { useEffect } from "react";

import * as Sentry from "@sentry/nextjs";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error("server.error", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body>
        <main
          id="main-content"
          className="grid min-h-screen place-items-center bg-background px-5 py-12"
        >
          <div className="w-full max-w-lg text-center text-foreground">
            <h1 className="text-4xl font-semibold tracking-[-0.065em] sm:text-5xl">
              Something went wrong.
            </h1>
            <p className="mt-5 leading-relaxed text-muted-foreground">
              An unexpected error occurred. Try again or return to TSKC.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button className="h-11 rounded-full px-6" size="lg" type="button" onClick={reset}>
                Try again
              </Button>
              <Button
                className="h-11 rounded-full px-6"
                size="lg"
                type="button"
                variant="outline"
                onClick={() => {
                  window.location.href = "/";
                }}
              >
                Back to TSKC
              </Button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
