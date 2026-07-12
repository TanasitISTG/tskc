# TSKC v1 Task Breakdown

## Definition of done

Every task includes accessible UI, server-side ownership checks, focused tests, and `bun run lint`, `bun run typecheck`, `bun test`, and `bun run build` where applicable. Product work must remain within the seller-only branded-website model in `docs/specs/digital-storefront-saas.md`.

## Task 1: Application foundation

Maintain the Next.js, Bun, TypeScript, Drizzle, Vitest, and dark design-system baseline.

## Task 2: Public landing page

Present the single THB 149 monthly branded-website plan. Explain the direct website value, the short setup path, and clear account calls to action. Do not show products, buyers, storefront checkout, wallets, or receipt payment.

## Task 3: Seller accounts and sessions

Implement Better Auth username/password registration plus Google and Discord OAuth; secure sessions; sign-out; and Resend password reset.

**Acceptance criteria**

- [x] Every authenticated user is a seller account; no buyer/seller role is persisted or selected.
- [x] Username/password accounts can request a generic-success password reset, while synthetic OAuth placeholder emails never receive mail.
- [x] Server procedures reject missing sessions; safe return paths reject external and protocol-relative destinations.
- [x] The responsive account panel uses the dark design tokens and has no marketplace or buyer flow.
- [x] Keep account linking explicit: never link users by display name or username. A signed-in user can connect Google or Discord from `/auth`, including providers with a different email; a social-only user can add password login through the password-reset flow.
- [x] Replace `account_not_linked` with recovery guidance: sign in using the existing method, then connect the provider from `/auth`.
- [x] Replace Better Auth's default error screen with a branded, accessible error page. Translate known auth errors (including `account_not_linked`) into short next steps and retain a clear route back to sign-in.

## Task 4: Subscription-plan decision and billing boundary

Choose the payment provider and document the checkout, verified-callback, idempotency, cancellation, grace-period, and suspension rules before implementing billing code.

## Task 5: Subscription lifecycle

Persist the seller's single-plan subscription and enforce its active/suspended state for website-management actions. Use provider-verified events only after Task 4's decision.

## Task 6: Seller onboarding and website identity

Let an active subscriber establish one website identity: site address policy, business name, brand assets, and essential public information.

## Task 7: Public branded website

Resolve and render a seller's active website safely, exposing only published public fields and clear unavailable/suspended states.

## Task 8: Website management

Provide the seller's protected editing experience for the website's approved content model. Every mutation derives ownership from the server session.

## Task 9: Production hardening and launch

Add monitoring, subscription-event auditability, rate-limit verification, host-resolution tests, accessibility checks, deployment configuration, and release documentation.

## Deliberately excluded from v1

Buyer identities, application roles, marketplace search, products, carts, receipt upload, wallets, payouts, fulfilment, file delivery, multiple sites per seller, custom domains, website templates, team access, and platform-owner UI.
