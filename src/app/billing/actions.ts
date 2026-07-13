"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth-guards";
import { createAuthContext } from "@/server/auth-context";
import { BillingServiceError, scheduleSellerCancellation } from "@/server/billing-service";

function billingErrorPath(error: unknown) {
  if (error instanceof BillingServiceError) {
    return `/billing?error=${error.code.toLowerCase()}`;
  }

  return "/billing?error=checkout_failed";
}

export async function cancelSubscriptionAction() {
  const identity = requireSession((await createAuthContext(await headers())).identity);
  let target = "/billing?cancel=scheduled";

  try {
    await scheduleSellerCancellation(identity.userId);
  } catch (error) {
    target = billingErrorPath(error);
  }

  redirect(target);
}
