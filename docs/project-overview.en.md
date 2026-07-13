# TSKC Project Overview

## Purpose

TSKC sells one product: a monthly plan for an independent business to have its own branded website. A customer creates one seller account, chooses the plan, and uses the resulting website as the direct online home for their business.

TSKC is not a marketplace, a multi-vendor commerce platform, or a buyer-wallet product. It does not need a separate buyer identity.

## Product Model

- Every authenticated person is a seller and website owner; there is no application role selection.
- A seller account owns one branded website in v1.
- The subscription plan grants access to website setup and ongoing management.
- The public website represents the seller's business directly. Visitor accounts, marketplace listings, checkout, receipt uploads, wallets, and digital-product fulfilment are out of scope.
- The first release uses one simple monthly Stripe plan at THB 149: `branded_website_monthly`, with card auto-renewal and PromptPay invoice collection.

## Seller Flow

1. Create an account with username/password or a supported OAuth provider.
2. Choose the branded-website plan.
3. Set the website's identity and essential business information.
4. Publish and maintain the branded website from the seller account.
5. Keep the plan active to retain management access.

## Technology Stack

| Layer           | Choice                              | Responsibility                                                                            |
| --------------- | ----------------------------------- | ----------------------------------------------------------------------------------------- |
| Web application | Next.js App Router                  | Public marketing, seller account, website setup, and public branded sites.                |
| Authentication  | Better Auth                         | Username/password, Google, Discord, secure sessions, and password reset.                  |
| Database        | Neon PostgreSQL + Drizzle ORM       | Authentication persistence, subscriptions, website configuration, and future tenant data. |
| API             | tRPC                                | Typed server procedures. Protected procedures resolve the session on every request.       |
| Email           | Resend                              | Password-reset links only.                                                                |
| Hosting         | Vercel                              | Next.js deployment and future branded-site host resolution.                               |
| UI              | shadcn/ui Base UI + Tailwind CSS v4 | Owned accessible components and dark-canvas interface following `DESIGN.md`.              |
| Tooling         | Bun, TypeScript, Vitest, ESLint     | Runtime, package manager, tests, and quality checks.                                      |

## Security and Operational Rules

- Keep authentication tokens and provider credentials server-only.
- Use Better Auth's httpOnly, secure-in-production, same-site session cookies and database-backed rate limits.
- Accept return paths only when they are same-origin paths beginning with one `/`; otherwise return to `/`.
- Password-reset requests always return a generic success state. Synthetic OAuth placeholder emails are never mailed.
- Resolve the session server-side for every protected procedure. Future website records must be scoped to the authenticated seller's account.
- Store Stripe credentials server-only; payment callbacks must accept only verified, idempotently processed Stripe events.

## Current Delivery Order

1. Foundation and public product landing page.
2. Seller accounts, sessions, and password reset.
3. Stripe billing boundary, environment contract, and lifecycle policy.
4. Seller onboarding, website identity, and public website publication.
5. Website management, production hardening, and launch.
