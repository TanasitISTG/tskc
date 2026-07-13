import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BillingPaymentMethod } from "@/lib/billing";
import { createAuthContext } from "@/server/auth-context";
import { getSellerBillingStatus, isBillingProviderAvailable } from "@/server/billing-service";

import { cancelSubscriptionAction } from "./actions";

type BillingPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const statusLabels = {
  active: "Active",
  canceled: "Canceled",
  past_due: "Payment grace period",
  pending: "Awaiting verified payment",
  suspended: "Suspended",
} as const;

const errorMessages: Record<string, string> = {
  already_active: "Your subscription is already active.",
  checkout_awaiting_payment: "Stripe is still confirming this checkout. Refresh shortly.",
  checkout_failed: "Checkout could not be started. Please try again.",
  checkout_unavailable: "The payment page is temporarily unavailable. Please try again shortly.",
  provider_unavailable: "Billing is temporarily unavailable.",
  subscription_not_found: "No subscription was found to cancel.",
};

function Notice({ params, active }: { params: Record<string, unknown>; active: boolean }) {
  if (params.access === "required") {
    return (
      <Alert>
        <AlertTitle>An active plan is required</AlertTitle>
        <AlertDescription>
          Complete a verified payment before opening website setup.
        </AlertDescription>
      </Alert>
    );
  }

  if (params.checkout === "cancelled") {
    return (
      <Alert>
        <AlertTitle>Checkout canceled</AlertTitle>
        <AlertDescription>No access was granted and you can safely try again.</AlertDescription>
      </Alert>
    );
  }

  if (params.checkout === "success") {
    return (
      <Alert>
        <AlertTitle>{active ? "Payment verified" : "Payment confirmation pending"}</AlertTitle>
        <AlertDescription>
          {active
            ? "Your website plan is active."
            : "Returning from Stripe does not grant access. This page updates after a verified paid-invoice event."}
        </AlertDescription>
      </Alert>
    );
  }

  if (params.cancel === "scheduled") {
    return (
      <Alert>
        <AlertTitle>Cancellation scheduled</AlertTitle>
        <AlertDescription>
          Your access continues through the current billing period.
        </AlertDescription>
      </Alert>
    );
  }

  const error = typeof params.error === "string" ? errorMessages[params.error] : undefined;
  return error === undefined ? null : (
    <Alert variant="destructive">
      <AlertTitle>Billing action failed</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}

function CheckoutForm({
  paymentMethod,
  label,
}: {
  paymentMethod: BillingPaymentMethod;
  label: string;
}) {
  return (
    <form action="/api/billing/checkout" method="post" target="_blank" rel="noopener">
      <input type="hidden" name="paymentMethod" value={paymentMethod} />
      <input type="hidden" name="next" value="/billing?checkout=success" />
      <Button className="w-full" size="lg" type="submit">
        {label}
        <span className="sr-only"> (opens in a new tab)</span>
      </Button>
    </form>
  );
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const authContext = await createAuthContext(await headers());

  if (authContext.identity === null) redirect("/auth?next=/billing");

  const [params, status] = await Promise.all([
    searchParams,
    getSellerBillingStatus(authContext.identity.userId),
  ]);
  const providerAvailable = isBillingProviderAvailable();
  const effectiveStatus = status?.status ?? "pending";
  const canChoosePayment = status === null || status.status === "canceled";
  const canResume = status?.status === "past_due" || status?.status === "suspended";

  return (
    <>
      <SiteHeader variant="app" user={authContext.user} />
      <main
        id="main-content"
        className="min-h-[calc(100vh-5.25rem)] bg-background px-5 py-12 sm:py-20"
      >
        <div className="mx-auto grid w-full max-w-4xl gap-6 lg:grid-cols-[1fr_22rem]">
          <section aria-labelledby="billing-title">
            <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              Seller account
            </p>
            <h1
              id="billing-title"
              className="mt-4 text-5xl font-semibold leading-[0.94] tracking-[-0.065em]"
            >
              Plan and billing
            </h1>
            <p className="mt-5 max-w-xl leading-relaxed text-muted-foreground">
              One monthly plan keeps your branded website available. Access changes only after
              Stripe sends a verified billing event.
            </p>

            <div className="mt-8 space-y-3" aria-live="polite">
              <Notice params={params} active={status?.status === "active"} />
              {!providerAvailable && (
                <Alert variant="destructive">
                  <AlertTitle>Billing provider unavailable</AlertTitle>
                  <AlertDescription>
                    Checkout and cancellation are disabled until Stripe configuration is restored.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <Card className="mt-6">
              <CardHeader className="border-b">
                <CardTitle>Current state</CardTitle>
                <CardDescription>
                  <span className="font-medium text-foreground">
                    {statusLabels[effectiveStatus]}
                  </span>
                  {status?.cancelAtPeriodEnd ? " · Cancels at period end" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {status?.status === "past_due" && status.graceUntil !== null && (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Website management and the public site remain available until{" "}
                    {status.graceUntil.toLocaleString("en-TH", { timeZone: "Asia/Bangkok" })}.
                  </p>
                )}
                {status?.status === "suspended" && (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Access is suspended. Paying the outstanding Stripe invoice restores it after the
                    verified paid event arrives.
                  </p>
                )}
                {status?.status === "active" && status.currentPeriodEnd !== null && (
                  <p className="text-sm text-muted-foreground">
                    Current period ends{" "}
                    {status.currentPeriodEnd.toLocaleDateString("en-TH", {
                      dateStyle: "long",
                      timeZone: "Asia/Bangkok",
                    })}
                    .
                  </p>
                )}
                {status?.status === "pending" && (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    No access is active yet. Complete payment and wait for Stripe verification.
                  </p>
                )}

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  {status?.status === "active" &&
                    !status.cancelAtPeriodEnd &&
                    providerAvailable && (
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={<Button type="button" variant="outline" size="lg" />}
                        >
                          Cancel at period end
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel at period end?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Your website stays available through the current billing period
                              {status.currentPeriodEnd === null
                                ? "."
                                : `, ending ${status.currentPeriodEnd.toLocaleDateString("en-TH", {
                                    dateStyle: "long",
                                    timeZone: "Asia/Bangkok",
                                  })}.`}{" "}
                              After that, website management and the public site are suspended.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep subscription</AlertDialogCancel>
                            <form action={cancelSubscriptionAction}>
                              <AlertDialogAction
                                type="submit"
                                variant="destructive"
                                className="w-full sm:w-auto"
                              >
                                Cancel at period end
                              </AlertDialogAction>
                            </form>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  {status?.accessAllowed && (
                    <Link
                      className={buttonVariants({ variant: "outline", size: "lg" })}
                      href="/setup/website"
                    >
                      Continue website setup
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          <aside aria-labelledby="plan-title">
            <Card>
              <CardHeader>
                <CardTitle id="plan-title">Branded website</CardTitle>
                <CardDescription>Monthly subscription</CardDescription>
              </CardHeader>
              <CardContent>
                <p>
                  <span className="text-4xl font-semibold tracking-[-0.06em]">THB 149</span>{" "}
                  <span className="text-muted-foreground">/ month</span>
                </p>
                <ul className="mt-6 space-y-2 border-t border-border pt-5 text-sm text-muted-foreground">
                  <li>Card recurring collection</li>
                  <li>PromptPay invoice due in 7 days</li>
                  <li>3-day payment grace period</li>
                </ul>

                {providerAvailable && canChoosePayment && (
                  <div className="mt-6 grid gap-3">
                    <CheckoutForm paymentMethod="card" label="Pay monthly by card" />
                    <CheckoutForm paymentMethod="promptpay" label="Pay invoice with PromptPay" />
                  </div>
                )}

                {providerAvailable &&
                  status?.status === "pending" &&
                  status.checkoutStatus === "pending" && (
                    <div className="mt-6">
                      <CheckoutForm paymentMethod={status.paymentMethod} label="Resume payment" />
                    </div>
                  )}

                {providerAvailable && canResume && status !== null && (
                  <div className="mt-6">
                    <CheckoutForm
                      paymentMethod={status.paymentMethod}
                      label="Pay outstanding invoice"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </>
  );
}
