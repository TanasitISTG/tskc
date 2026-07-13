import { NextResponse } from "next/server";

import { billingCheckoutInputSchema } from "@/lib/billing";
import { createAuthContext } from "@/server/auth-context";
import { BillingServiceError, startSellerCheckout } from "@/server/billing-service";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return new Response(null, { status: 403 });
  }

  const identity = (await createAuthContext(request.headers)).identity;
  if (identity === null) {
    return NextResponse.redirect(new URL("/auth?next=/billing", request.url), 303);
  }

  const formData = await request.formData();
  const next = formData.get("next");

  try {
    const input = billingCheckoutInputSchema.parse({
      paymentMethod: formData.get("paymentMethod"),
      ...(typeof next === "string" ? { next } : {}),
    });
    return NextResponse.redirect((await startSellerCheckout(identity.userId, input)).url, 303);
  } catch (error) {
    const code =
      error instanceof BillingServiceError ? error.code.toLowerCase() : "checkout_failed";
    return NextResponse.redirect(new URL(`/billing?error=${code}`, request.url), 303);
  }
}
