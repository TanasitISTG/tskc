# ADR-001: Sell one branded-website plan to one account type

## Status

Accepted

## Date

2026-07-11

## Context

The initial product documents and Task 3 implementation described a marketplace with seller and buyer roles, wallet top-ups, receipt validation, products, and delivery. The product direction is instead a single subscription plan that an independent business buys for its own branded website.

Maintaining both models would create unnecessary authorization, data, payment, and interface complexity, while obscuring the actual thing TSKC sells.

## Decision

TSKC has one application identity: the seller / website owner. Authentication creates a seller account without a role selector or role table. The product has one monthly branded-website plan in v1. Public visitors do not need an account.

The existing initial Better Auth migration is re-baselined before deployment to omit the unused application role enum and join table. Any environment that has already applied the previous baseline must not replace migrations in place; it needs a separately reviewed expand/contract removal migration.

## Alternatives Considered

### Keep buyer and seller roles for future commerce

- Pro: Preserves a possible future marketplace direction.
- Cons: Adds immediate authorization, onboarding, schema, UI, and security burden for a product that does not need it.
- Rejected: Future marketplace work can add a separate model after a real product decision.

### Keep role tables but hide the role picker

- Pro: Smaller short-term code diff.
- Cons: Leaves a misleading security model and unused schema in the product.
- Rejected: The model should be removed, not cosmetically suppressed.

## Consequences

- Protected procedures authenticate a seller session but do not perform role checks.
- Website ownership will be checked against the session user ID when website data is introduced.
- Documentation, landing copy, and account UI describe a direct branded-site subscription.
- Stripe is the accepted v1 payment provider; ADR-002 defines the billing boundary and payment-method constraints before implementation.
