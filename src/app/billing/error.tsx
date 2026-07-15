"use client";

import { useEffect } from "react";

import * as Sentry from "@sentry/nextjs";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function BillingError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main id="main-content" className="grid min-h-screen place-items-center px-5 py-12">
      <Alert variant="destructive" className="max-w-lg">
        <AlertTitle>Billing status could not be loaded</AlertTitle>
        <AlertDescription>
          Your subscription was not changed. Try loading the status again.
          <Button className="mt-4" type="button" variant="outline" size="lg" onClick={reset}>
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    </main>
  );
}
