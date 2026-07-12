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

1. Checkout starts only from an authenticated seller session. The server selects the internal plan, Stripe Price ID, amount, seller ID, and collection method.
2. Success and cancel return paths are same-origin, safe, and informational. A browser redirect never activates access.
3. Stripe webhook signatures are verified with `STRIPE_WEBHOOK_SECRET`. Provider event IDs are stored before applying an idempotent state transition; invalid, replayed, malformed, delayed, and out-of-order events have no unauthorized effect.
4. A subscription becomes active only after a verified paid event. Card renewals and PromptPay invoice payments both feed the same subscription state machine.
5. The subscription contract defines pending, active, past-due, canceled, grace-period, suspended, abandoned-checkout, retry, and recovery behavior before lifecycle implementation begins.

## Consequences

- The implementation must test two payment paths: automatic card renewal and PromptPay/mobile-banking invoice payment.
- PromptPay's monthly experience is invoice-driven rather than automatic debit; the approved due date and grace period must be visible to the seller.
- Stripe secrets remain server-only. Client input cannot choose an amount, plan, seller, provider status, or subscription state.
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
