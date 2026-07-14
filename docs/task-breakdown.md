# TSKC v1 Task Breakdown

## Product contract

TSKC sells one monthly branded-website plan to one account type: the seller / website owner. The v1 business flow is:

1. A visitor opens the platform landing page.
2. The visitor creates an account or signs in.
3. The seller chooses the single Stripe plan and pays by credit/debit card or PromptPay through a participating Thai bank app.
4. A verified payment event activates the seller's subscription.
5. The seller sets the website identity and essential public information.
6. The seller publishes the website.
7. A public visitor opens the seller's assigned host and sees published content.
8. The seller returns to the protected workspace to maintain the website while the plan is active.
9. Cancellation, grace-period, suspension, and unpublished states are handled explicitly.

Every task below must move this path forward. A task is not complete merely because its isolated UI or database code exists.

## Current implementation snapshot

Reviewed 2026-07-12 against the code graph, source files, tests, migrations, and all repository Markdown documents.

- Present: the dark landing page at `/`, account flow at `/auth`, billing management at `/billing`, the Better Auth and Stripe webhook API routes, server-side session context, host/subdomain validation, shop ownership helpers, subscription persistence, and subscription-aware setup/public-host gates.
- Present: focused coverage for auth, environment validation, request tenancy, billing contracts, signed event normalization, replay and ordering behavior, subscription state/access, database constraints, and a gated provider sandbox flow for card and PromptPay.
- Missing: seller onboarding fields, protected website editing/publication, completed published website rendering, and the production launch path.
- The current build exposes the platform/account/billing routes and a subscription-gated website setup placeholder; the seller workspace and published branded-site content remain later tasks.
- Baseline checks currently pass: `bun run lint`, `bun run typecheck`, `bun test`, and `bun run build`.

## Definition of done

Every task must meet these rules:

- [ ] The implementation stays within `docs/specs/digital-storefront-saas.md`, `docs/project-overview.en.md`, `DESIGN.md`, `docs/decisions/001-seller-only-branded-website-product.md`, and `docs/decisions/002-stripe-billing-provider.md`.
- [ ] The application has one seller identity. No role picker, buyer identity, marketplace model, or platform-owner self-selection is introduced.
- [ ] Protected procedures resolve the session on the server and derive ownership from `session.user.id`; the client never supplies the authority for an owner check.
- [ ] Website setup, editing, and publication require an active subscription according to the final grace/suspension policy.
- [ ] User input is validated at the server boundary. Public rendering exposes only approved published fields and safe asset/URL values.
- [ ] UI work keeps visible labels, semantic headings, keyboard access, 44px controls, visible focus, WCAG AA contrast, reduced-motion behavior, and no horizontal overflow at 320px.
- [ ] Each new branch, parser, mutation, payment event, or security boundary has focused Vitest coverage. Use the existing Vitest setup before adding a new test framework.
- [ ] Before launch, all of `bun run fmt:check`, `bun run lint`, `bun run typecheck`, `bun test`, and `bun run build` pass.
- [ ] Any migration, provider callback, or launch change has a manual verification step and a documented rollback or recovery path.

## Task 1: Foundation, canonical ownership, and migration safety

**Status:** Implemented; disposable PostgreSQL migration application remains the only unchecked verification.

**Description:** Keep the existing stack and establish the smallest schema that supports one seller, one website, one plan, and one subscription. Reconcile the current `shop` / `shop_membership` code with ADR-001 before adding more domain data. The ownership table may remain only if it represents one-to-one website ownership rather than application roles; otherwise replace it with a direct owner relation. Do not carry a generic role model into v1.

**Dependencies:** None.

**Files likely touched:** `src/db/schema.ts`, `src/server/shops.ts`, `src/lib/env.ts`, `.env.example`, `drizzle/*.sql`, `drizzle/meta/*`, and focused schema/environment tests.

**Acceptance criteria:**

- [x] The canonical v1 ownership model is written down: one authenticated seller owns at most one website and no application role is persisted or selected.
- [x] `shop` / `shop_membership` is either reduced to that ownership invariant or replaced; no unused role enum or application-role join table remains.
- [ ] A fresh database can apply the complete migration sequence without manual edits.
- [x] A database that has already applied an old baseline uses a separately reviewed expand/contract migration; no applied migration is rewritten in place.
- [x] `.env.example` documents only agreed integrations. Current `SLIP2GO_*` variables are not treated as an accepted payment-provider decision.
- [x] Server-only secrets, OAuth credentials, payment credentials, and reset tokens cannot enter browser bundles or public website data.

**Verification:**

- [x] Run `bun run db:generate` and review the generated SQL and snapshot diff.
- [x] Run `tests/migration-safety.test.ts` to confirm legacy role cleanup is additive and schema-qualified.
- [ ] Apply migrations to a disposable PostgreSQL database, then run the schema and ownership tests.
- [x] Run `bun run fmt:check`, `bun run lint`, `bun run typecheck`, and `bun test`.

**Estimated scope:** Medium; larger only if an already-used migration requires expand/contract cleanup.

## Task 2: Public product landing page

**Status:** Complete.

**Description:** Make the platform host clearly sell one THB 149/month branded-website plan and lead visitors into the account flow. The page should describe the positive business outcome and the short setup path, not rejected marketplace concepts.

**Dependencies:** Task 1 for the stable platform host and environment contract.

**Files likely touched:** `src/app/page.tsx`, `src/components/site-header.tsx`, `src/app/globals.css`, and landing-page tests or manual smoke notes.

**Acceptance criteria:**

- [x] The platform host renders the landing page; a seller host never renders the platform landing page.
- [x] The page presents exactly one branded-website plan at THB 149/month with one primary account CTA and a clear sign-in path.
- [x] CTA links enter `/auth` and preserve a safe internal continuation path for the first incomplete seller step.
- [x] Copy follows `DESIGN.md`: use seller, business owner, branded website, and plan language; remove rejected-commerce vocabulary from user-facing landing copy.
- [x] The page has the required responsive layout, accessible headings and landmarks, keyboard navigation, visible focus, and no horizontal overflow at 320px.
- [x] The pricing card, website preview, and feature tiles remain within the dark design tokens and component rules.

**Verification:**

- [x] Run the landing page at the platform host in development and check desktop, 810px, and 320px widths.
- [x] Keyboard-tab through navigation, CTA links, FAQ controls, and the mobile menu.
- [x] Run the landing contract tests and `bun run lint`, `bun run typecheck`, `bun test`, and `bun run build`.

**Estimated scope:** Small.

## Task 3: Seller accounts, sessions, and protected entry

**Status:** Auth primitives and post-auth continuation are implemented. Provider-backed manual auth flows remain to be exercised before this task is fully closed.

**Description:** Finish the single-seller account flow using the existing Better Auth integration. Preserve explicit account linking, generic password-reset responses, synthetic OAuth handling, safe return paths, and server-side session ownership. After sign-in, send the seller to the first incomplete protected step rather than defaulting to the public landing page.

**Dependencies:** Task 1; Task 2 for the public entry point.

**Files likely touched:** `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/lib/auth-account.ts`, `src/lib/auth-guards.ts`, `src/server/auth-context.ts`, `src/server/trpc.ts`, `src/app/auth/page.tsx`, `src/app/auth/error/page.tsx`, `src/app/api/auth/[...all]/route.ts`, and existing auth tests.

**Acceptance criteria:**

- [ ] Username/password registration and sign-in create a seller account without a role selector or role record.
- [ ] Google and Discord sign-in work when configured; a social identity without an email receives a synthetic placeholder address and never receives a reset email.
- [ ] A signed-in seller can connect Google or Discord explicitly, including a provider with a different email; no implicit linking by username or display name occurs.
- [ ] Password reset always returns generic-success copy, and the reset token flow handles missing, expired, invalid, and successful tokens without leaking account existence.
- [ ] Sign-out revokes the session and returns to the platform landing page.
- [ ] `next` accepts only a same-origin path beginning with exactly one `/`; invalid and protocol-relative values fall back safely.
- [x] The default authenticated continuation points to the first incomplete protected step (plan selection once billing exists), while an explicit valid `next` is preserved.
- [ ] Protected tRPC/server procedures reject missing sessions and expose only the authenticated seller identity.
- [ ] Known Better Auth errors, including `account_not_linked`, render branded recovery guidance with a clear route back to sign-in.

**Verification:**

- [x] Keep the existing auth-account, auth-guards, Resend, environment, and tRPC tests green; add regression coverage for the post-auth continuation.
- [ ] Manually test registration, sign-in, sign-out, password reset, Google/Discord callbacks, explicit provider linking, and an invalid `next` value.
- [ ] Confirm production configuration fails closed when database, Better Auth, OAuth, or Resend settings are incomplete.

**Estimated scope:** Medium.

## Checkpoint A: Platform and identity

- [ ] A new seller can open the platform landing page, create an account, sign in, and reach the protected product entry point.
- [ ] An unauthenticated request cannot read or mutate protected seller data.
- [ ] No user-facing page introduces a second account type or marketplace flow.
- [ ] `bun run fmt:check`, `bun run lint`, `bun run typecheck`, `bun test`, and `bun run build` pass.

## Task 4: Stripe payment-provider decision and billing boundary

**Status:** Complete. The contract, server configuration, checkout paths, signed callback boundary, and sandbox verification are implemented.

**Description:** Implement the accepted Stripe billing boundary before checkout or callbacks. The contract covers the single THB 149/month plan, integer currency representation, Stripe Product/Price IDs, credit/debit cards, PromptPay QR through Thai mobile banking apps, card auto-renewal, PromptPay invoice collection, safe return paths, verified events, idempotency, cancellation, grace period, suspension, retries, and reconciliation. Do not add top-up, receipt verification, or balance features to the seller-facing website.

**Dependencies:** Task 1 and Task 3.

**Files likely touched:** `docs/decisions/002-stripe-billing-provider.md`, `src/lib/env.ts`, `.env.example`, billing contract/types, and provider contract tests.

**Acceptance criteria:**

- [x] Stripe is selected and its sandbox/API/webhook capabilities are documented in approved `docs/decisions/002-stripe-billing-provider.md`.
- [x] Required payment options are recorded as credit/debit cards plus PromptPay, with mobile banking defined as the participating Thai bank-app QR flow.
- [x] The plan has one stable internal identifier, a provider price/product identifier, and an integer minor-unit amount (`THB 14900` if the provider uses satang).
- [x] The checkout contract defines authenticated entry, Stripe card subscription and PromptPay invoice paths, success/cancel return paths, duplicate checkout behavior, and what happens when a payment is abandoned.
- [x] The callback contract accepts only provider-verified signatures/events, records provider event IDs, is idempotent, and safely handles retries and out-of-order delivery.
- [x] The contract defines active, past-due, canceled, grace-period, and suspended behavior for both automatic card renewal and PromptPay invoice payment before Task 5 starts.
- [x] Provider secrets stay server-only and no client-controlled amount, plan, seller ID, or subscription status is trusted.
- [x] Invalid, replayed, and malformed provider events have no unauthorized subscription side effect.
- [x] The seller-facing website remains a branded-site template boundary and does not add top-up, receipt verification, balances, wallets, products, carts, payouts, or buyer accounts.

**Verification:**

- [x] Review the accepted Stripe provider decision, payment-method constraints, and callback threat model before implementation.
- [x] Exercise provider sandbox checkout and signed/invalid/replayed webhook fixtures.
- [x] Confirm the chosen environment variables are complete in `.env.example` and production startup validation.

**Estimated scope:** Small decision plus a medium contract/test slice.

## Task 5: Subscription lifecycle and access gating

**Status:** Complete. Subscription persistence, Stripe checkout/invoice flows, signed event processing, access gating, recovery, cancellation, and billing UI states are implemented.

**Description:** Persist the seller's single subscription and make subscription state the server-side gate for website setup, editing, and publication. The seller must be able to see the current plan state and recover from checkout failures without receiving false access.

**Collection policy:** Card subscriptions use automatic recurring collection. PromptPay/mobile-banking subscriptions use Stripe's `send_invoice` collection path; access is granted only after a verified paid invoice event, and due/grace/past-due states are explicit.

**Dependencies:** Task 4.

**Files likely touched:** `src/db/schema.ts`, a migration, `src/server/subscriptions.ts`, `src/server/trpc.ts`, seller account/plan UI routes, and subscription tests.

**Acceptance criteria:**

- [x] The database enforces at most one v1 subscription per seller and stores the provider customer/subscription identifiers, internal plan, status, billing period, cancellation state, and last verified event metadata needed for reconciliation.
- [x] Only a verified provider event can activate or suspend a subscription; a browser success redirect alone cannot grant access.
- [x] A seller can start checkout only when authenticated and can view a consistent pending/active/past-due/canceled/suspended state.
- [x] Card renewals and PromptPay/mobile-banking invoice payments feed the same server-side subscription state machine without granting access from a browser success redirect.
- [x] Website setup and the shared future editing/publication guard reject inactive sellers server-side with a stable error and an actionable plan link.
- [x] The approved grace-period policy is applied consistently to management access and public publication.
- [x] Duplicate, delayed, and out-of-order events do not create duplicate subscriptions or move state backward incorrectly.
- [x] Seller A cannot read or mutate Seller B's subscription by changing an ID in the request.
- [x] The UI has loading, failure, canceled-checkout, and unavailable-provider states with accessible status messages.

**Verification:**

- [x] Add unit/integration tests for state transitions, idempotency, ownership, and inactive-access rejection.
- [x] Run a provider sandbox checkout for a new seller and verify the database transition only after the signed event is accepted.
- [x] Exercise both a card automatic-collection fixture and a PromptPay/mobile-banking invoice fixture, including unpaid, paid, past-due, grace, and recovery transitions.
- [x] Test cancellation, grace-period expiry, suspension, and recovery using provider-backed fixtures and an injected application clock.

**Estimated scope:** Large; split schema, server procedures, and UI into separate implementation increments if more than five files are needed.

## Checkpoint B: Plan access

- [x] A new seller cannot enter website setup before verified subscription activation.
- [x] A verified active subscription unlocks the next protected step.
- [x] A canceled, suspended, or past-due subscription follows the approved policy and cannot bypass it through direct requests.
- [x] Replayed and invalid provider events are harmless and observable.

## Task 6: Seller onboarding and website identity

**Status:** Implemented. Production R2 provisioning and the manual two-seller/browser checks remain deployment gates.

**Description:** Give an active seller one protected setup flow for the website identity and essential public information. Finalize the smallest content model before coding; keep draft and published state separate so incomplete edits never leak to public visitors.

**Dependencies:** Task 1 and Task 5.

**Files likely touched:** `src/db/schema.ts`, a migration, `src/lib/tenancy.ts`, `src/server/shops.ts` or its replacement, `src/server/websites.ts`, protected setup UI, and website/schema tests.

**Acceptance criteria:**

- [x] The data model enforces one website per seller and a unique normalized platform subdomain/host label.
- [x] The hostname policy defines reserved labels, allowed characters, length limits, case/whitespace normalization, and whether custom domains are out of scope.
- [x] The setup form captures only approved v1 fields: business identity, brand presentation, essential public description, contact information, and approved links/assets.
- [x] Every field is validated server-side with safe URL, length, format, and asset constraints; invalid input returns field-level errors without data loss.
- [x] Setup reads and mutations derive the seller from the session and require an active subscription.
- [x] Draft data is never returned by the public host resolver; publication is an explicit action with a visible success/failure state.
- [x] Asset handling uses R2, validates content type/size, and does not expose storage credentials.
- [x] The form is keyboard accessible, uses visible labels and associated errors, and works at mobile widths.

**Verification:**

- [x] Test normalized/duplicate/reserved subdomains, invalid public fields, cross-seller access, inactive subscriptions, and draft isolation.
- [ ] Manually create a website as Seller A, confirm Seller B cannot see or edit it, and confirm unpublished data is absent from the public host.
- [ ] Run the database, server, and accessibility checks before moving to public rendering.

**Estimated scope:** Large; keep the content model and asset path deliberately minimal.

**Implementation notes:** `shop.draft_content` and `shop.published_content` are typed JSONB snapshots added by migration `0005_tough_black_tom.sql`. Publishing writes both snapshots atomically; later draft saves leave the published snapshot unchanged. Logo and hero objects use immutable versioned R2 keys, with 2 MiB and 5 MiB limits respectively. Production requires a custom-domain `R2_PUBLIC_BASE_URL`; `r2.dev` is limited to non-production use. Set `R2_SMOKE=1` to opt into the upload/public-fetch/delete smoke test.

## Task 7: Public branded website and host resolution

**Status:** Complete.

**Description:** Replace `StorefrontPlaceholder` with a safe public website route. Preserve the existing platform-vs-seller host boundary and render only the seller's published public record. Unknown, malformed, unpublished, and suspended hosts need clear controlled behavior.

**Dependencies:** Task 6.

**Files likely touched:** `src/app/page.tsx`, `src/server/request-context.ts`, `src/server/shops.ts` or website queries, public website components/styles, and tenancy/request tests.

**Acceptance criteria:**

- [x] The configured platform host renders the marketing landing page.
- [x] A known seller host resolves through the validated `Host` header path and renders only published fields for that seller.
- [x] Unknown, unrelated, nested, malformed, and reserved hosts do not resolve another seller and return the documented 404/unavailable state.
- [x] Forwarded or client-supplied host values are not trusted over the request host boundary already defined by the tenancy tests.
- [x] Unpublished and suspended sites follow the approved public behavior and never reveal drafts or private subscription data.
- [x] Public content is escaped/rendered safely, assets use approved URLs, and no account/session/payment data is exposed.
- [x] The public page has a stable responsive layout, semantic structure, accessible contrast/focus behavior, and no marketplace/storefront copy.

**Verification:**

- [x] Add request-level tests for platform, known seller, unknown seller, malformed host, unpublished, and suspended states.
- [x] Run a local host-header smoke test and a production-like preview with a real published record.
- [x] Verify the public response does not contain draft fields, session tokens, provider IDs, or private contact data.

**Estimated scope:** Medium.

## Task 8: Protected website management

**Status:** Implemented; end-to-end two-seller verification pending.

**Description:** Provide the seller workspace that connects plan status, onboarding, editing, preview, publication, and sign-out into one maintainable flow. Reuse the existing protected procedure and ownership patterns instead of adding client-side authorization checks.

**Dependencies:** Task 5, Task 6, and Task 7.

**Files likely touched:** Protected app routes/components, `src/server/trpc.ts`, `src/server/websites.ts`, subscription/account components, and management-flow tests.

**Acceptance criteria:**

- [x] The protected entry route shows the seller's plan state and the correct next action: choose plan, finish setup, publish, or manage.
- [x] A seller can edit approved fields, preview the draft, publish, unpublish, and return to the public website without losing changes.
- [x] All reads and mutations use the authenticated session user ID; no request accepts a client-supplied owner as authority.
- [x] Inactive subscriptions cannot edit or publish, and the UI explains how to restore access.
- [x] Success, validation, conflict, network, and stale-data states are recoverable and accessible.
- [x] Sign-out works from the workspace and returns to the platform landing page.
- [x] The implementation does not add buyer accounts, multiple sites, templates, team access, or a platform-owner UI.

**Verification:**

- [ ] Run an end-to-end manual flow with two seller accounts: Seller A can manage only A, and Seller B can manage only B.
- [ ] Confirm a publish change is visible on the correct public host and absent from every other host.
- [x] Test direct requests to protected procedures with no session and reject client-supplied ownership fields before database access.
- [ ] Test inactive subscriptions and valid active ownership against a configured database.

**Estimated scope:** Large; deliver as vertical increments for read, edit, publish, and subscription-state UX.

## Checkpoint C: Complete product flow

- [ ] A new seller can move from account creation through verified checkout, setup, publish, and public-site viewing without a manual database edit.
- [ ] A returning seller lands in the correct next step and can maintain the site.
- [ ] A second seller cannot access, mutate, or observe the first seller's subscription, draft, published content, assets, or host.
- [ ] Unauthenticated, inactive, unpublished, unknown-host, and malformed-input paths are tested.

## Task 9: Production hardening and launch

**Status:** Not started.

**Description:** Prepare a reversible, observable launch. Cover application quality, security, accessibility, infrastructure, migration execution, monitoring, and the first-hour business-flow smoke test.

**Dependencies:** Checkpoint C.

**Files likely touched:** `.env.example`, `src/lib/env.ts`, health/error handling, monitoring hooks, deployment configuration, migration/release documentation, and launch tests/checklists.

**Acceptance criteria:**

- [ ] `bun run fmt:check`, `bun run lint`, `bun run typecheck`, `bun test`, and `bun run build` pass with no unresolved warnings or debug logging.
- [ ] Production has the approved `PLATFORM_DOMAIN`, database, Better Auth, OAuth, Resend, and Stripe configuration (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, and enabled card/PromptPay methods); optional storage is configured only if used.
- [ ] Database migrations are reviewed, applied in order, backed up where required, and safe for the actual deployment history.
- [ ] Health/readiness checks cover application boot, database connectivity, auth configuration, and the selected payment integration without exposing secrets.
- [ ] Monitoring captures auth failures, checkout failures, callback verification failures, subscription transitions, publication failures, host-resolution failures, and server errors.
- [ ] Rate limits, session-cookie settings, CORS/origin rules, security headers, input validation, and secret handling are verified for production.
- [ ] Keyboard, screen-reader, contrast, focus, reduced-motion, and mobile checks pass for landing, auth, plan, onboarding, management, and public-site pages.
- [ ] A rollback plan exists for application deployment, subscription activation, publication, and database migration; the kill switch or provider disable path is known.
- [ ] Staging smoke tests pass before production, and a named owner monitors the first hour after launch.

**Verification:**

- [ ] Deploy to staging and run the complete business flow with sandbox payment events and two seller accounts.
- [ ] Deploy to production with the documented rollout/kill-switch plan, verify the health check, logs, error dashboard, and latency dashboard.
- [ ] Manually repeat the critical seller flow in production, confirm logs are readable, and verify rollback readiness.

**Estimated scope:** Medium/large launch slice; keep operational work separate from feature refactors.

## Final launch gate: expected business flow

Do not mark v1 complete until every item below passes in a production-like environment and the relevant evidence is recorded.

- [ ] **Landing:** A visitor at the platform host sees one branded-website plan and can reach `/auth`.
- [ ] **Account:** The visitor creates a seller account or signs in with username/password, Google, or Discord without selecting a role.
- [ ] **Continuation:** Successful auth lands on the first incomplete protected step; malicious or external `next` values cannot redirect out of the application.
- [ ] **Checkout:** The authenticated seller starts the one Stripe plan using credit/debit card auto-renewal or PromptPay/mobile-banking invoice payment; amount, plan, collection method, and seller are server-controlled.
- [ ] **Activation:** The subscription becomes active only after a valid, verified, idempotently processed provider event.
- [ ] **Onboarding:** The active seller saves one normalized website identity and approved public content with server-side validation.
- [ ] **Publication:** The seller explicitly publishes; draft content remains private until then.
- [ ] **Public site:** The assigned seller host renders only the published website; the platform host still renders the landing page.
- [ ] **Management:** The seller can return, edit, preview, publish/unpublish, and sign out from the protected workspace.
- [ ] **Lifecycle:** Card renewal and PromptPay invoice payment, cancellation, grace-period expiry, suspension, and recovery match the approved billing policy for both management and public visibility.
- [ ] **Template boundary:** The seller-facing website remains a branded website; top-up, receipt verification, balance/wallet ledger, products, carts, payouts, and buyer accounts are absent.
- [ ] **Isolation:** Seller A cannot read or mutate Seller B's plan, website, assets, drafts, or published output.
- [ ] **Operations:** Health checks, logs, error reporting, payment-event auditability, monitoring, and rollback are ready before announcing launch.

## Open decisions required before implementation reaches the dependent task

- Exact Stripe Product/Price IDs, invoice due date, cancellation policy, grace period, past-due/suspension behavior, and public-site visibility policy.
- Resolved: retain the one-to-one `shop_membership` ownership table and derive ownership from the authenticated seller.
- Resolved: platform subdomains are normalized 1–63 character DNS labels; `www`, `api`, `admin`, `app`, `auth`, `billing`, `setup`, `support`, `help`, `mail`, and `status` are reserved; custom domains remain out of scope.
- Resolved: v1 stores business name, description, optional tagline/contact/address/accent/link fields, and R2-hosted logo/hero assets.

## Deliberately excluded from v1

Buyer identities, application roles, marketplace search, products, carts, top-up, receipt upload/verification, balances, wallets, payouts, fulfilment, file delivery, multiple sites per seller, custom domains, website templates, team access, and platform-owner UI.
