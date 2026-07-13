# ADR-002: Use Stripe for v1 subscription billing

## Status

Accepted

## Date

2026-07-12

## Context

TSKC sells one THB 149/month branded-website plan to the seller / website owner. The platform needs a provider for checkout, recurring billing, verified callbacks, cancellation, retries, and reconciliation.

The seller-facing website remains a branded website. It does not become a commerce template with top-ups, receipt upload or verification, wallet/balance ledgers, products, carts, or buyer accounts.

## Decision

Use Stripe for v1 platform subscription billing.

- Internal plan identifier: `branded_website_monthly`.
- Display price: THB 149/month.
- Provider amount: `14900` satang, represented as an integer minor unit.
- Provider identifiers: a Stripe Product and Price, with the Price ID stored server-side as `STRIPE_PRICE_ID`.
- Required payment options:
  - Credit and debit cards through Stripe Billing / Checkout.
  - PromptPay through Stripe's Thai QR payment flow.
  - Mobile banking means the participating Thai bank-app flow used to scan and complete a PromptPay QR payment; it is not a separate unverified payment rail.

Cards use automatic recurring collection. PromptPay/mobile-banking payments use Stripe's invoice-based `send_invoice` collection path because Stripe documents PromptPay subscriptions and invoices with that limitation; the application must not pretend that PromptPay supports automatic card-style debits.

## Billing contract

### Checkout boundary

1. Checkout starts only from an authenticated seller session. The server selects the internal plan, Stripe Price ID, amount, seller ID, and collection method.
2. Card uses the subscription checkout path with `charge_automatically`. PromptPay uses the subscription/invoice path with `send_invoice` and a seven-day due period. The first PromptPay invoice is finalized explicitly so Stripe can return its Hosted Invoice Page immediately; this intentionally forgoes Stripe's one-hour draft-edit window.
3. A seller has at most one pending checkout. A new request reuses the pending attempt and Stripe idempotency key. Card Checkout expires after 30 minutes; PromptPay remains pending through the invoice due date. An abandoned attempt grants no access, and an expired unpaid PromptPay subscription is canceled before a replacement is created.
4. Success and cancel return paths are same-origin, safe, and informational. The default destinations are `/billing?checkout=success` and `/billing?checkout=cancelled`; optional `next` values use the existing `safeReturnTo` helper. A browser redirect never activates access.

### Lifecycle policy

The internal state is `pending`, `active`, `past_due`, `canceled`, or `suspended`. A grace window is represented by `past_due` plus `graceUntil`, not by a separate persisted status.

| Condition                                          | State/effect                           | Management and public site        |
| -------------------------------------------------- | -------------------------------------- | --------------------------------- |
| Checkout started or abandoned                      | Pending/abandoned checkout             | No access                         |
| Verified `invoice.paid`                            | Active, including recoverable recovery | Available                         |
| Card renewal failure or PromptPay invoice past due | `past_due`, three-day grace starts     | Available through `graceUntil`    |
| Seller cancellation                                | Cancel at period end; then `canceled`  | Available through the paid period |
| Grace expiry                                       | Suspended                              | Both unavailable                  |
| Terminal provider cancellation                     | `canceled`                             | Both unavailable                  |

Payment recovery before terminal cancellation returns the subscription to `active`. The provider's retry behavior must not extend the application grace policy without a verified payment event.

### Event boundary

The accepted Stripe event set is `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `invoice.payment_action_required`, `invoice.overdue`, `invoice.finalization_failed`, `customer.subscription.updated`, and `customer.subscription.deleted`. `checkout.session.completed` records provider references only; only verified `invoice.paid` activates or recovers access. `invoice.overdue` starts the same three-day grace policy as a failed card invoice. Finalization failures are reconciliation signals, not activation signals.

The webhook endpoint is `POST /api/stripe/webhook`. Signatures are verified from the raw request body with `STRIPE_WEBHOOK_SECRET`. A unique provider event ID is claimed before applying the transition in the same PostgreSQL statement; processing metadata is then recorded separately for observability. State-changing events are monotonic by provider creation time, paid events win same-time failure races, and canceled subscriptions cannot be reactivated by an older invoice. Invalid, replayed, malformed, delayed, and out-of-order events have no unauthorized effect.

## Consequences

- The implementation must test two payment paths: automatic card renewal and PromptPay/mobile-banking invoice payment.
- PromptPay's monthly experience is invoice-driven rather than automatic debit; the approved due date and grace period must be visible to the seller.
- Stripe secrets remain server-only. Client input cannot choose an amount, plan, seller, provider status, or subscription state.
- The Task 5 migration is additive. Deployment rollback reverts the application code and leaves the two billing tables in place for a later retry; dropping event or subscription history is not an approved rollback.
- Platform billing does not add top-up, receipt verification, balances, wallets, products, carts, payouts, or buyer accounts to the seller website.

## Alternatives considered

### Keep the existing `SLIP2GO_*` configuration

- Rejected: the existing variables do not represent an approved Stripe billing contract and must not be treated as the v1 provider.

### Treat PromptPay as automatic recurring billing

- Rejected: Stripe's documented PromptPay subscription path uses invoices, so the product must model monthly invoice payment and its due/grace states explicitly.

## Sources

- [Stripe global availability](https://stripe.com/gb/global)
- [Stripe PromptPay payments](https://docs.stripe.com/payments/promptpay)
- [Stripe payment method support](https://docs.stripe.com/payments/payment-methods/payment-method-support)
- [Stripe cards](https://docs.stripe.com/payments/cards)
- [Stripe recurring payments](https://docs.stripe.com/recurring-payments)
- [Stripe subscription invoices](https://docs.stripe.com/billing/invoices/subscription)
- [Stripe webhooks](https://docs.stripe.com/webhooks)
