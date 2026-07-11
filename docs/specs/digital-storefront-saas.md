# Spec: Branded Website SaaS

## Objective

TSKC gives an independent business a direct, branded web presence through one monthly plan. The product's job is to move a seller from account creation to a published website without introducing a marketplace or a second account type.

## Users

- **Seller / website owner:** The only application user in v1. They subscribe, configure, publish, and manage their website.
- **Public visitor:** Can view a published website but does not create an account in v1.
- **Platform operator:** Operational access is out of scope for this version and must not be represented as a self-selectable role.

## Scope for v1

- A public landing page that explains the single branded-website plan.
- Seller account creation and sign-in through username/password, Google, Facebook, or Discord.
- Password resets through Resend; email verification is not required in v1.
- One seller account and one branded website.
- Plan selection, subscription state, website identity, essential public content, and publication controls.
- A responsive public branded website.

## Explicit Non-goals for v1

- Buyer accounts, application roles, marketplace discovery, carts, checkout, receipt uploads, wallets, payouts, order history, or digital-product delivery.
- Multiple websites per seller, custom domains, website templates, and payment-provider implementation before the provider decision.
- Platform-owner UI, team accounts, and delegated access.

## Product Rules

### Identity and access

- Authentication establishes a seller account; it does not assign a buyer or seller role.
- Protected server procedures reject missing sessions with unauthenticated responses.
- Each future website query and mutation must establish ownership from the session user ID on the server.
- `next` must be a same-origin path beginning with exactly one `/`; invalid values fall back to `/`.

### Subscription and website

- A seller subscribes to one monthly branded-website plan, initially THB 149 per month.
- An active subscription permits website setup, editing, and publication. The final grace-period and suspension rules belong to the subscription task.
- Each seller owns one website in v1. Adding multiple websites requires a new approved product decision.
- The website contains the seller's brand and business information; it is not a product catalogue or customer-account surface.

### Payment boundary

- The payment provider has not been selected. No billing credentials, receipt validator, or money-movement code may be added on assumption.
- When a provider is selected, checkout/callbacks must use provider-verified events, idempotency keys, integer minor currency units, and an approved security review.

## Technical Boundaries

- Use Better Auth's documented Next.js handler, username plugin, social providers, database adapter, and rate limiter.
- Persist Better Auth's `user`, `account`, `session`, `verification`, and `rate_limit` tables through Drizzle.
- Do not expose session tokens, account records, OAuth credentials, or password-reset tokens to browser code.
- Resend is called only through the server-side HTTP wrapper. Synthetic OAuth emails ending in `@oauth.invalid` never receive a reset email.
- Keep the dark canvas, white pill actions, blue focus signal, visible labels, 44px controls, and single-column mobile behavior defined in `DESIGN.md`.

## Success Criteria

1. A seller can create an account, sign in, sign out, and reset a password without choosing a role.
2. OAuth callbacks return to a safe in-app path and a social identity without a provider email does not trigger an email-collection or reset-mail flow.
3. An unauthenticated protected procedure is rejected, while an authenticated seller procedure receives only that seller's identity.
4. The public landing page clearly sells a branded website plan, not marketplace commerce.
5. The plan, onboarding, website, and publication work can be added without reintroducing buyer identities or marketplace data.

## Open Decisions

- Payment provider, checkout experience, cancellation policy, and subscription grace period.
- Branded-site hostname/subdomain policy and custom-domain roadmap.
- The exact website content model and editing experience.
